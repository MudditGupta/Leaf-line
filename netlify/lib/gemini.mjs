// Shared helper: calls the free Google Gemini API from the server so the key never reaches the browser.
const MODELS = (Netlify.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",").map(s => s.trim()).filter(Boolean);

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

export async function gemini(parts, { json = false } = {}) {
  const key = Netlify.env.get("GEMINI_API_KEY");
  if (!key) throw new HttpError(500, "The app isn't set up yet: add GEMINI_API_KEY in Netlify → Project configuration → Environment variables, then redeploy.");
  let lastErr;
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
      if (!text) throw new HttpError(502, "The AI returned an empty answer. Try a clearer photo.");
      return text;
    }
    if (r.status === 429) throw new HttpError(429, "Free limit reached for now. Wait a minute and try again.");
    lastErr = new HttpError(502, data.error?.message || `AI request failed (${r.status}).`);
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw lastErr;
}

export const json = (status, body) => Response.json(body, { status });
