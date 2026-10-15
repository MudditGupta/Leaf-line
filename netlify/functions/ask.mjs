import { gemini, json } from "../lib/gemini.mjs";

export default async (req) => {
  try {
    const { context = "", question = "" } = await req.json().catch(() => ({}));
    const q = String(question).slice(0, 500).trim();
    if (!q) return json(400, { error: "Type a question first." });
    const prompt = `You are a friendly plant-care expert. ${String(context).slice(0, 2000)}

Answer the owner's question in 3-5 short sentences, practical and specific. Plain text, no markdown.

Question: ${q}`;
    return json(200, { answer: await gemini([{ text: prompt }]) });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Couldn't get an answer. Try again." });
  }
};

export const config = { path: "/api/ask", method: "POST" };
