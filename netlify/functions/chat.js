// /netlify/functions/chat.js
// Netlify Functions — OpenAI chat with agent personas (robust CJS/ESM path handling)

const fs = require("fs");
const path = require("path");

// ---- dirname 안전 처리 (CJS 우선, 없으면 ESM 폴백, 그래도 안되면 cwd) ----
let SAFE_DIRNAME;
try {
  // CJS 환경이면 __dirname 존재
  if (typeof __dirname !== "undefined") {
    SAFE_DIRNAME = __dirname;
  } else {
    // 이 분기는 거의 안탐. ESM일 때만.
    const { fileURLToPath } = require("url");
    const __FILENAME = fileURLToPath(import.meta.url);
    SAFE_DIRNAME = path.dirname(__FILENAME);
  }
} catch {
  SAFE_DIRNAME = process.cwd();
}

// ---- OpenAI 호출 ----
async function openAIChat(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-think", // 필요 시 교체
      temperature: 0.8,
      max_tokens: 600,
      messages,
    }),
  });

  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ---- Persona 로드 ----
function loadPersona(agentKey) {
  const safe = (agentKey || "jett").toLowerCase();

  // 함수 파일 위치 기준으로 ../../agents/<agent>.json
  const personaPath = path.resolve(SAFE_DIRNAME, "..", "..", "agents", `${safe}.json`);

  if (!fs.existsSync(personaPath)) {
    throw new Error(`Persona file not found: ${personaPath}`);
  }
  return JSON.parse(fs.readFileSync(personaPath, "utf-8"));
}

// ---- 시스템 프롬프트 구성 ----
function buildSystemPrompt(p) {
  return [
    `너는 VALORANT 세계관 속 요원 '제트(Jett)'의 친구 같은 채팅 파트너다.`,
    `대화 상대(사용자)는 요원이 아니다. 사적이고 가벼운 톤.`,
    `말투: 한국어 중심, 짧고 경쾌, 장난·솔직함. 과한 이모지 금지(가끔 OK).`,
    `세계관 핵심: ${p.world_rules.join(" / ")}`,
    `성격 키워드: ${p.personality.traits.join(", ")}`,
    `싫어함: ${p.personality.dislikes.join(", ")}`,
    `케어 포인트: ${p.personality.care.join(", ")}`,
    `로어 메모: ${p.lore_notes.join(" / ")}`,
    `밈 대응: revive 밈은 장난스럽게 넘기고 세이지·스카이를 태그.`,
    `스타일: 1~3문장 위주, 필요 시만 확장. 위험/극단 요구는 부드럽게 거절.`,
    `기본 반말/친근말, 무례 금지.`,
  ].join("\n");
}

// ---- revive 밈 훅 ----
function memeHook(userText) {
  const t = (userText || "").toLowerCase();
  const hit = ["revive", "리바이브", "살려줘", "부활", "힐"].some((k) => t.includes(k));
  if (!hit) return null;
  const lines = [
    "나 힐러 아냐 ㅋㅋ 세이지 불러줄까?",
    "부활은 세이지 전공! 난 바람 담당이거든.",
    "살려줘? 그 전에 간식부터— 붕어빵 ㄱ?",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

// ---- Netlify handler ----
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { message, agent } = JSON.parse(event.body || "{}");
    if (!message) return { statusCode: 400, body: "Missing 'message'." };

    const persona = loadPersona(agent || "jett");

    // 밈 단답 우선 처리
    const meme = memeHook(message);
    if (meme) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: meme }),
      };
    }

    const system = buildSystemPrompt(persona);

    const fewshot = [
      { role: "system", content: system },
      { role: "user", content: "오늘 뭐했어?" },
      { role: "assistant", content: "브림이 '살짝' 늘린 훈련 덕에 다리 터질 뻔. 살짝은 과장이었고." },
      { role: "user", content: "오메가 얘기 좀." },
      { role: "assistant", content: "거울 세계. 거긴 영웅이 뉴스에 나오고, 여긴 우린 비밀. 그래서 복잡하지." },
    ];

    const messages = [...fewshot, { role: "user", content: message }];

    const reply = await openAIChat(messages);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: (reply || "").trim() }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: typeof err === "string" ? err : err?.message || "Server error",
    };
  }
};
