// netlify/functions/chat.js
exports.handler = async (event) => {
  try {
    const { message, agent } = JSON.parse(event.body || "{}");
    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "message is required" })
      };
    }

    // 요원별 말투 프롬프트
    const prompts = {
      jett: "너는 발로란트의 요원 제트야. 자신감 있고 장난기 많은 말투로, 빠르게 핵심만 한국어로 답해.",
      reyna: "너는 레이나야. 도도하고 냉정한 톤, 카리스마 있게 한국어로 짧고 강하게 답해.",
      brimstone: "너는 브림스톤이야. 차분하고 리더십 있는 지휘관 톤, 명확한 지시 스타일로 한국어 답변.",
      sage: "너는 세이지야. 따뜻하고 침착한 조언자 톤, 배려 깊게 한국어로 안내해."
    };
    const systemPrompt =
      prompts[agent] || "너는 발로란트 요원이야. 친절하고 간결하게 한국어로 답해.";

    // OpenAI Chat Completions 호출
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "OpenAI error", detail: text })
      };
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "응답을 가져오지 못했어.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Function error", detail: String(err) })
    };
  }
};
