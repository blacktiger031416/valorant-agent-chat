// netlify/functions/chat.js
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

// ---- __filename/__dirname 충돌 방지 (CJS/ESM 모두 안전) ----
const RUNTIME_FILENAME =
  typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
const RUNTIME_DIRNAME =
  typeof __dirname !== "undefined" ? __dirname : dirname(RUNTIME_FILENAME);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- utils ---------------------------------------------------------
function loadAgentOrThrow(agentId) {
  // 루트/agents/{id}.json (netlify.toml에 included_files 설정되어 있어야 함)
  const p = join(RUNTIME_DIRNAME, "../../agents", `${agentId}.json`);
  const raw = readFileSync(p, "utf8");
  const agent = JSON.parse(raw);
  if (!agent || !agent.system) throw new Error("Invalid agent file");
  return agent;
}

function buildSystemPrompt(agent) {
  const rules = [
    ...(Array.isArray(agent.system) ? agent.system : [agent.system]),
    "Always answer in Korean unless user explicitly switches language.",
    "Do NOT repeat or mirror the user's message. Never start replies by echoing the user.",
    "Keep messages short and punchy (1–3 short lines) unless the user asks for detail.",
  ];
  return rules.join("\n- ");
}

function antiEcho(text, user) {
  const t = (text || "").trim();
  const u = (user || "").trim();
  if (!t) return "";
  if (u && (t === u || t.startsWith(u))) return t.slice(u.length).trim();
  return t;
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

    const agent = loadAgentOrThrow(agentId);

    const MAX_HISTORY = 8;
    const trimmed = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];

    const messages = [{ role: "system", content: buildSystemPrompt(agent) }];

    if (Array.isArray(agent.few_shot)) {
      agent.few_shot.forEach((ex) => {
        if (ex.user && ex.assistant) {
          messages.push({ role: "user", content: ex.user });
          messages.push({ role: "assistant", content: ex.assistant });
        }
      });
    }

    trimmed.forEach((m) => {
      if (!m || !m.role || !m.content) return;
      const role = m.role === "assistant" ? "assistant" : "user";
      messages.push({ role, content: String(m.content) });
    });

    messages.push({ role: "user", content: message });

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

    text = antiEcho(text, message) || agent.fallback || text;
    text = String(text).replace(/^\s*\[fallback\].*?:\s*/i, "").trim();

    return json(200, {
      reply: text,
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
