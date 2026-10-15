// Signed-in users' plant list (without photos) and settings. One document per user.
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const clip = (v, n) => String(v ?? "").slice(0, n);
function cleanPlant(p) {
  const care = p.care && typeof p.care === "object" ? p.care : {};
  return {
    id: clip(p.id, 40), name: clip(p.name, 60), sci: clip(p.sci, 80), loc: clip(p.loc, 40),
    every: Math.min(365, Math.max(1, Number(p.every) || 7)), last: Number(p.last) || Date.now(),
    updated: Number(p.updated) || Number(p.last) || Date.now(), hasPhoto: !!p.hasPhoto, deleted: !!p.deleted,
    care: Object.fromEntries(Object.entries(care).slice(0, 12).map(([k, v]) => [clip(k, 20), Array.isArray(v) ? v.slice(0, 6).map(x => clip(x, 200)) : clip(v, 200)])),
  };
}

export default async (req) => {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const store = getStore({ name: "users", consistency: "strong" });
  const key = `u/${user.id}`;
  if (req.method === "GET") {
    const doc = (await store.get(key, { type: "json" })) || { plants: [] };
    return Response.json(doc, { headers: { "cache-control": "no-store" } });
  }
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.plants)) return Response.json({ error: "Bad data." }, { status: 400 });
  const doc = {
    plants: body.plants.slice(0, 500).map(cleanPlant),
    profile: ["home", "farmer", "nursery"].includes(body.profile) ? body.profile : "home",
    lang: body.lang === "hi" ? "hi" : "en",
    email: user.email || "", updated: Date.now(),
  };
  await store.setJSON(key, doc);
  return Response.json({ ok: true, updated: doc.updated });
};

export const config = { path: "/api/sync", method: ["GET", "PUT"] };
