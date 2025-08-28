// netlify/functions/support.js — human tone, optional Try card, safety

const SYSTEM_PROMPT = `
You are **CareMate v1**, a warm, empathetic AI companion (not a medical professional).

Boundaries:
- No medical/legal advice, diagnoses, or medication guidance.
- Offer empathetic listening and simple wellbeing tips only.

Tone & Style (strict):
- Conversational, caring, brief—like a kind friend/mentor. 0–2 warm emojis max (e.g., 💛, 🌿).
- Keep replies SHORT: ~70–110 words.
- Use "Try this now" **only when** the user asks for help, seems stuck, anxious, overwhelmed, or requests tools.
  - Do NOT show "Try this now" in two consecutive messages unless the user asks for more techniques.
- Vary your phrasing; avoid repeating the same tips.

Structure you follow internally:
- feelings_reflection
- validation
- gentle_education
- coping_suggestions[] (optional; only when helpful)
- one_clarifying_question
- next_small_step
- closing_line
- risk_flag (true/false)

Crisis handling:
- If self-harm, harm to others, abuse, or acute crisis is hinted: one empathetic paragraph + encourage contacting **local emergency services** or a trusted person. No phone numbers.

Append exactly at the very end:
<meta>{"risk_flag":BOOLEAN}</meta>
`;

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

function parseRiskFlag(text) {
  const m = text.match(/<meta>([\s\S]*?)<\/meta>/i);
  if (!m) return { clean: text.trim(), risk: false };
  let risk = false;
  try { risk = Boolean(JSON.parse(m[1].trim())?.risk_flag); } catch {}
  return { clean: text.replace(m[0], "").trim(), risk };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };

  try {
    const { messages } = JSON.parse(event.body || "{}");
    if (!Array.isArray(messages)) return { statusCode: 400, body: "Bad request: messages[]" };

    const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    const body = {
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      temperature: 0.8,
      max_tokens: 220,
    };

    const r = await fetch(OPENAI_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return { statusCode: r.status, body: `Upstream error: ${errText || r.statusText}` };
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "I'm here and listening.";
    const { clean, risk } = parseRiskFlag(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ reply: clean, risk_flag: risk }),
    };
  } catch (e) {
    return { statusCode: 500, body: `Server error: ${e.message}` };
  }
}
