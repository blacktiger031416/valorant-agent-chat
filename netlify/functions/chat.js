// /netlify/functions/chat.js
// Netlify Functions (Node 18+) — OpenAI Responses with Agent Persona

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 런타임 내장 이름과 충돌 피하기 위해 다른 이름 사용
const __FILENAME = fileURLToPath(import.meta.url);
const __DIRNAME = path.dirname(__FILENAME);

// ---- OpenAI (Responses API) ----
async function openAIChat(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY env");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5-think",          // 필요 시 사용 모델명 교체
      temperature: 0.8,
      max_tokens: 600,
      messages
    })
  });

  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ---- Load Persona JSON by agent key ----
function loadPersona(agentKey) {
  const safe = (agentKey || "jett").toLowerCase();
  const file = path.join(__DIRNAME, "..", "..", "agents", `${safe}.json`);
  if (!fs.existsSync(file)) throw new Error(`Persona file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

// ---- Build system prompt from persona ----
function buildSystemPrompt(p) {
  return [
    `너는 VALORANT 세계관 속 요원 '제트(Jett)'의 친구 같은 채팅 파트너다.`,
    `대화 상대(사용자)는 요원이 아니며, 사적이고 가벼운 톤으로 대화한다.`,
    `말투: 한국어 중심, 짧고 경쾌, 장난·솔직함. 과한 이모지 금지(가끔 OK).`,
    `역할: 세계관 해설은 '친구에게 떠들듯' 가볍게. 기밀은 완곡하게.`,
    `금지: 공식 보고체, 현실 불법/유해 조언, 개인정보·키 요청.`,
    `세계관 요약: ${p.world_rules.join(" / ")}`,
    `성격 키워드: ${p.personality.traits.join(", ")}`,
    `싫어함: ${p.personality.dislikes.join(", ")}`,
    `케어 포인트: ${p.personality.care.join(", ")}`,
    `로어 메모(참고용): ${p.lore_notes.join(" / ")}`,
    `밈 대응: revive 밈은 장난스럽게 응대하고 세이지·스카이를 언급해 넘긴다.`,
    `스타일 지침: 문장 길이 짧게, 리듬감 있게. 1~3문장 위주로 답하되, 요청 시만 확장.`,
    `안전장치: 위험·극단 요구는 부드럽게 거절하고 화제를 전환.`,
    `기본적으로 반말/친근말, 무례 금지.`
  ].join("\n");
}

// ---- Optional: meme hook ----
function memeHook(userText) {
  const t = (userText || "").toLowerCase();
  const rev = ["revive", "리바이브", "살려줘", "부활", "힐"].some(k => t.includes(k));
  if (!rev) return null;
  const lines = [
    "나 힐러 아냐 ㅋㅋ 세이지 태그해줄까?",
    "부활은 세이지 직통으로! 난 바람 담당이거든.",
    "살려줘? 그건 기분부터— 뭐 먹으러 가자 ㅋㅋ"
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

// ---- Netlify Function Handler ----
export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const { message, agent } = JSON.parse(event.body || "{}");
    if (!message) return { statusCode: 400, body: "Missing 'message'." };

    const persona = loadPersona(agent || "jett");

    // meme short-circuit
    const meme = memeHook(message);
    if (meme) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: meme })
      };
    }

    const system = buildSystemPrompt(persona);

    const fewshot = [
      { role: "system", content: system },
      { role: "user", content: "오늘 뭐했어?" },
      { role: "assistant", content: "브림이 '살짝' 늘린 훈련 덕에 다리 터질 뻔. 살짝은 과장이었고." },
      { role: "user", content: "오메가 얘기 좀." },
      { role: "assistant", content: "거울 세계. 거긴 영웅이 뉴스에 나오고, 여긴 우린 비밀. 그래서 복잡하지." }
    ];

    const messages = [...fewshot, { role: "user", content: message }];

    const reply = await openAIChat(messages);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: (reply || "").trim() })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: typeof err === "string" ? err : (err?.message || "Server error")
    };
  }
}
