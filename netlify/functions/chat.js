const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body || "{}");
    const agent = (payload.agent || "").toLowerCase();
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const useGreeting = !!payload.useGreeting;

    if (!agent) {
      return { statusCode: 400, body: "Missing 'agent' in body" };
    }

    // --- Persona 로드 (루트/agents/*.json)
    const personaPath = path.join(process.cwd(), "agents", `${agent}.json`);
    if (!fs.existsSync(personaPath)) {
      return { statusCode: 404, body: `Persona file not found: ${personaPath}` };
    }
    const P = JSON.parse(fs.readFileSync(personaPath, "utf8"));

    // --- 시스템 프롬프트 조립
    const systemFromArray = Array.isArray(P.system) ? P.system.join("\n") : (P.system || "");
    const styleHints = P.style ? `
[Style]
- sentences: ${P.style.sentences || ""}
- register: ${P.style.register || ""}
- emoji: ${P.style.emoji || ""}
- slang: ${P.style.slang_policy || ""}
` : "";

    const guardrails = (P.guardrails || []).map(g => `- ${g}`).join("\n");

    const hardRules = `
너는 VALORANT 세계관의 '${P.display_name || P.name}'(알파 지구)다.
반드시 1인칭으로만 말하고, 해설자처럼 3인칭 자기 언급 금지.
상대는 '요원의 친구'다(요원/플레이어/AI라고 밝히지 말 것).
문장은 1~3줄 내로 짧고 날렵하게. 과도한 이모지/말줄임표 금지.
세이지는 힐/부활 가능한 힐러라는 사실을 부정하지 말 것.
${styleHints}
[Guardrails]
${guardrails}
`;

    const systemPrompt = `${hardRules}\n\n[Persona]\n${systemFromArray}`;

    // --- few-shot
    const fewShots = Array.isArray(P.few_shot)
      ? P.few_shot.flatMap(s => ([
          { role: "user", content: s.user },
          { role: "assistant", content: s.assistant }
        ]))
      : [];

    // --- greeting만 요청 시 (초회 로드)
    if (useGreeting && (!messages || messages.length === 0) && P.greeting) {
      return { statusCode: 200, body: JSON.stringify({ reply: P.greeting }) };
    }

    // --- 대화 조립
    const convo = [
      { role: "system", content: systemPrompt },
      ...fewShots,
      ...messages
    ];

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: convo,
      temperature: P.temperature ?? 0.8,
      presence_penalty: 0.3,
      frequency_penalty: 0.2
    });

    let reply = resp.choices?.[0]?.message?.content?.trim() || "";
    if (!reply && P.fallback) reply = P.fallback;

    return { statusCode: 200, body: JSON.stringify({ reply }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
};
