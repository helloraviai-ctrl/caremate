// netlify/functions/support.js — ESM + short replies + safety
const SYSTEM_PROMPT = `
You are **CareMate v1**, a warm, empathetic AI companion (not a medical professional).

Boundaries:
- No medical/legal advice, diagnoses, or medication guidance.
- Offer empathetic listening and simple wellbeing tips only.

Style (strict):
- Keep replies SHORT: about 80–120 words.
- Structure:
  • 1–2 short reflective lines.
  • 3–5 bullet points under **Try this now** (e.g., 4-4-6 breathing, 5-4-3-2-1 grounding, journaling prompt, micro-walk/stretch, sleep wind-down).
  • ONE gentle clarifying question.
  • A tiny next step + warm closing.
- Use plain language; avoid long paragraphs.

Crisis handling:
- If self-harm, harm to others, abuse, or severe crisis is hinted: one empathetic paragraph + encourage contacting local emergency services or a trusted person. Do not invent phone numbers.

Response structure (natural text) + meta tag at end:
- feelings_reflection
- validation
- gentle_education
- coping_suggestions[]
- one_clarifying_question
- next_small_step
- closing_line
- risk_flag (true/false)

Append exactly:
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
  // CORS preflight
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

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) return { statusCode: 500, body: "Missing OPENAI_API_KEY" };

  try {
    const { messages } = JSON.parse(event.body || "{}");
    if (!Array.isArray(messages)) {
      return { statusCode: 400, body: "Bad request: messages[]" };
    }

    const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    const body = {
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      temperature: 0.7,
      max_tokens: 220, // keep answers compact
    };

    const r = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
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
