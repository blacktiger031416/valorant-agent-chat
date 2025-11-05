// netlify/functions/chat.js
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- utils ---------------------------------------------------------
function loadAgentOrThrow(agentId) {
  // 루트/agents/{id}.json 에서 읽어옴
  const p = join(__dirname, "../../agents", `${agentId}.json`);
  const raw = readFileSync(p, "utf8");
  const agent = JSON.parse(raw);

  if (!agent || !agent.system) throw new Error("Invalid agent file");
  return agent;
}

function buildSystemPrompt(agent) {
  // 시스템 규칙 + 안티에코 + 한국어 고정
  const rules = [
    ...(Array.isArray(agent.system) ? agent.system : [agent.system]),
    "Always answer in Korean unless user explicitly switches language.",
    "Do NOT repeat or mirror the user's message. Never start replies by echoing the user.",
    "Keep messages short and punchy (1–3 short lines) unless the user asks for detail.",
  ];
  return rules.join("\n- ");
}

function jettStyleGuard(text) {
  // 과도한 에코 제거: 사용자 인풋 그대로 시작/포함 시 컷
  return (prevUser) => {
    const t = (text || "").trim();
    const u = (prevUser || "").trim();
    if (!t) return "";

    // 완전 동일/접두 에코 방지
    if (u && (t === u || t.startsWith(u))) {
      return t.slice(u.length).trim();
    }
    return t;
  };
}

// --- handler -------------------------------------------------------
export async function handler(event) {
  try {
    const { message, history = [], agentId = "jett" } =
      event.httpMethod === "POST"
        ? JSON.parse(event.body || "{}")
        : Object.fromEntries(new URL(event.rawUrl).searchParams);

    if (!message || typeof message !== "string") {
      return json(400, { error: "Missing 'message' string." });
    }

    // 1) 에이전트 로딩
    const agent = loadAgentOrThrow(agentId);

    // 2) 메시지 스택 구성 (과거 대화 일부만)
    const MAX_HISTORY = 8;
    const trimmed = Array.isArray(history)
      ? history.slice(-MAX_HISTORY)
      : [];

    const messages = [
      { role: "system", content: buildSystemPrompt(agent) },
    ];

    // few-shot이 있으면 먼저 주입 (제트 말투 고정)
    if (Array.isArray(agent.few_shot)) {
      agent.few_shot.forEach((ex) => {
        if (ex.user && ex.assistant) {
          messages.push({ role: "user", content: ex.user });
          messages.push({ role: "assistant", content: ex.assistant });
        }
      });
    }

    // 과거 대화 반영
    trimmed.forEach((m) => {
      if (!m || !m.role || !m.content) return;
      const role = m.role === "assistant" ? "assistant" : "user";
      messages.push({ role, content: String(m.content) });
    });

    // 현재 사용자 입력
    messages.push({ role: "user", content: message });

    // 3) 호출
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 300,
    });

    let text =
      resp.choices?.[0]?.message?.content?.trim() ||
      agent.fallback ||
      "음… 다시 말해줘. 이번엔 내가 깔끔하게 받아칠게.";

    // 4) 에코 방지 후처리
    const cleaned = jettStyleGuard(text)(message) || agent.fallback;

    // fallback 태그 등 프리픽스 제거
    const finalText = String(cleaned)
      .replace(/^\s*\[fallback\].*?:\s*/i, "")
      .trim();

    return json(200, {
      reply: finalText,
      meta: { agent: agent.display_name || agent.name || agentId },
    });
  } catch (err) {
    return json(500, {
      error: String(err?.message || err),
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
}

// --- helpers -------------------------------------------------------
function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
