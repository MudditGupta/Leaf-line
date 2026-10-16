// Calls the free Google Gemini API from the server so the key never reaches the browser.
// Free models get briefly overloaded (503) or rate-limited (429), so each call retries once
// and then falls back to the next model; each model has its own free quota.
const MODELS = (Netlify.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3-flash-preview")
  .split(",").map(s => s.trim()).filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

export async function gemini(parts, { json = false } = {}) {
  const key = Netlify.env.get("GEMINI_API_KEY");
  if (!key) throw new HttpError(500, "The app isn't set up yet: add GEMINI_API_KEY in Netlify → Project configuration → Environment variables, then redeploy.");
  let sawLimit = false;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r, data = {};
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: "application/json" } : {}) },
          }),
          signal: AbortSignal.timeout(25000),
        });
        data = await r.json().catch(() => ({}));
      } catch (e) {
        console.log(`gemini ${model} network error: ${e.name}`);
        if (attempt === 0) { await sleep(700); continue; } else break;
      }
      if (r.ok) {
        const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
        if (text) return text;
        console.log(`gemini ${model} empty answer, finish=${data.candidates?.[0]?.finishReason}`);
        break; // try the next model
      }
      console.log(`gemini ${model} ${r.status}: ${data.error?.message?.slice(0, 200)}`);
      if (r.status === 429) { sawLimit = true; break; }            // this model's quota is used up: next model
      if (r.status >= 500 && attempt === 0) { await sleep(900); continue; } // overloaded: wait and retry once
      if (r.status === 400 && /api key/i.test(data.error?.message || "")) throw new HttpError(500, "The AI key isn't valid. Check GEMINI_API_KEY in Netlify.");
      break; // 404 (model not available) or second failure: next model
    }
  }
  throw sawLimit
    ? new HttpError(429, "Today's free AI limit is used up. Please try again later.")
    : new HttpError(503, "The plant expert is busy right now. Please try again in a few seconds.");
}

export const json = (status, body) => Response.json(body, { status });
