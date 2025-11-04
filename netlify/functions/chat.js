// netlify/functions/chat.js  (CommonJS 버전)
exports.handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body || "{}");
    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "message is required" })
      };
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a Valorant agent chatting with the user. 답변은 기본적으로 한국어로 간결하게."
          },
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
