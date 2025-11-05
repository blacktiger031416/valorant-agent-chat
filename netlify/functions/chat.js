// netlify/functions/chat.js
// CommonJS 기반: __dirname 사용 (ESM 혼용 시 나던 __filename 충돌/undefined 문제 회피)

const fs = require("fs");
const path = require("path");

// ----- (선택) OpenAI 사용 설정: 키 없으면 자동으로 에코 fallback -----
let openai = null;
try {
  const { OpenAI } = require("openai");
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (_) {
  // openai 패키지 미설치여도 오류 안 나게 스킵
}

// 현재 파일 기준 함수 디렉토리
const SAFE_DIRNAME = __dirname;

/**
 * persona JSON을 안전하게 로드
 * - Netlify 함수 번들 구조/로컬 실행 모두 지원
 * - included_files 설정으로 agents/*.json이 번들에 포함됨
 */
function loadPersona(agentKey) {
  const key = (agentKey || "jett").toLowerCase();

  const tryPaths = [
    // 1) 배포 런타임 기준(서버에서 process.cwd()가 루트인 케이스)
    path.resolve(process.cwd(), "agents", `${key}.json`),

    // 2) 함수 파일 기준으로 프로젝트 루트/agents
    path.resolve(SAFE_DIRNAME, "..", "..", "agents", `${key}.json`),

    // 3) 함수 디렉터리 내부에 agents가 들어간 경우
    path.resolve(SAFE_DIRNAME, "agents", `${key}.json`),
  ];

  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      } catch (e) {
        throw new Error(`Failed to parse persona JSON: ${p}\n${e.message}`);
      }
    }
  }

  throw new Error(
    "Persona file not found.\nTried:\n" + tryPaths.map((p) => ` - ${p}`).join("\n")
  );
}

/**
 * 요청 Body 파서 (JSON/폼/쿼리 폭넓게 수용)
 */
function parseRequest(event) {
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      body = {};
    }
  }

  const query = event.queryStringParameters || {};
  const message = body.message || query.message || "";
  const agent = body.agent || query.agent || "jett";

  return { message, agent };
}

/**
 * OpenAI가 있으면 실제 답변 생성, 없으면 안전한 에코
 */
async function generateReply({ message, persona }) {
  const system = persona?.system || persona?.systemPrompt || "";
  const style = persona?.style || "";

  // OpenAI 사용 가능 시
  if (openai) {
    try {
      const prompt = [
        { role: "system", content: system },
        { role: "user", content: `${style ? `Style: ${style}\n` : ""}${message}` },
      ];

      const res = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: prompt,
        temperature: 0.7,
      });

      const answer = res?.choices?.[0]?.message?.content?.trim();
      if (answer) return answer;
    } catch (e) {
      // OpenAI 실패 시 fallback
      return `[fallback] ${persona?.name || "Agent"}: ${message}`;
    }
  }

  // OpenAI 키 없음 또는 실패 시
  return `${persona?.name || "Agent"}(fallback): ${message}`;
}

/**
 * Netlify 함수 핸들러
 */
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { message, agent } = parseRequest(event);
    const persona = loadPersona(agent);

    const reply = await generateReply({ message, persona });

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
      body: JSON.stringify({
        agent,
        reply,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: true,
        message: err?.message || "Unknown server error",
      }),
    };
  }
};
