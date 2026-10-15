import { gemini, json } from "../lib/gemini.mjs";
import { withContext } from "../lib/context.mjs";
import { useQuota } from "../lib/quota.mjs";

export default async (req, context) => {
  try {
    const { context: plantCtx = "", question = "", profile, lang, deviceId } = await req.json().catch(() => ({}));
    const q = String(question).slice(0, 500).trim();
    if (!q) return json(400, { error: "Type a question first." });
    await useQuota(req, context, "ask", deviceId);
    const prompt = `You are a friendly plant-care expert. ${String(plantCtx).slice(0, 2000)}

Answer the owner's question in 3-5 short sentences, practical and specific. Plain text, no markdown.

Question: ${q}`;
    return json(200, { answer: await gemini([{ text: withContext(prompt, { profile, lang }) }]) });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Couldn't get an answer. Try again.", code: e.code });
  }
};

export const config = {
  path: "/api/ask", method: "POST",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
