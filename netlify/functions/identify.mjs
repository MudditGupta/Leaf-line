import { gemini, json } from "../lib/gemini.mjs";

const PROMPT = `You are a plant identification and care expert. Identify the plant in the photo and assess its visible health.
Reply with ONLY a JSON object of this exact shape:
{"is_plant":true,"name":"common name","scientific":"Genus species","family":"Family","confidence":0-100,
"summary":"one or two plain sentences about the plant",
"water_days":integer days between waterings for a typical indoor pot,
"watering_tip":"how to tell when to water, one sentence",
"light":"2-3 words","humidity":"1-2 words","temperature":"range in °C","soil":"short","fertilizer":"short","toxicity":"pet safety, short","difficulty":"Easy|Moderate|Hard",
"health":{"status":"healthy|minor|serious","headline":"short verdict","detail":"what you see and what to do, 1-2 sentences"},
"tips":["3-4 short practical tips"],"problems":["2-3 common problems for this plant"],"alternatives":["up to 2 other species it might be"]}
If the photo has no plant, return {"is_plant":false}. Keep every string short.`;
const HEALTH_PROMPT = `You are a plant doctor. Look closely at the plant in the photo and diagnose its health.
Reply with ONLY a JSON object of this exact shape:
{"is_plant":true,"name":"common name","scientific":"Genus species","confidence":0-100,
"status":"healthy|minor|serious","headline":"short verdict, e.g. Overwatering and early root rot",
"diagnosis":"what you see and what it means, 1-2 plain sentences",
"urgency":"Act today|This week|No action needed",
"causes":["up to 3 likely causes"],"treatment":["3-5 concrete steps to take now, in order"],"prevention":["2-3 short tips to stop it coming back"]}
If the photo has no plant, return {"is_plant":false}. Keep every string short.`;
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default async (req) => {
  try {
    const { image, mime = "image/jpeg", mode = "identify" } = await req.json().catch(() => ({}));
    if (typeof image !== "string" || !image) return json(400, { error: "No photo received." });
    if (!MIMES.has(mime)) return json(400, { error: "Use a JPEG, PNG or WebP photo." });
    if (image.length > 4_000_000) return json(413, { error: "Photo is too large. Try again." });
    const text = await gemini([{ text: mode === "health" ? HEALTH_PROMPT : PROMPT }, { inline_data: { mime_type: mime, data: image } }], { json: true });
    try { return json(200, JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""))); }
    catch { return json(502, { error: "The answer came back garbled. Try again." }); }
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Something went wrong. Try again." });
  }
};

export const config = { path: "/api/identify", method: "POST" };
