// Saves (or removes) one device's push subscription and its plants' next watering dates.
import { getStore } from "@netlify/blobs";
import { PUSH_HOSTS } from "../lib/push.mjs";

export default async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.deviceId || "");
    if (!/^[a-z0-9-]{8,64}$/i.test(id)) return Response.json({ error: "Bad device id." }, { status: 400 });
    const store = getStore("reminders");
    if (!body.subscription) { await store.delete(id); return Response.json({ ok: true, off: true }); }
    const sub = body.subscription;
    let host = "";
    try { const u = new URL(String(sub?.endpoint)); host = u.protocol === "https:" ? u.hostname : ""; } catch {}
    if (!PUSH_HOSTS.test(host) || typeof sub?.keys?.p256dh !== "string" || typeof sub?.keys?.auth !== "string") return Response.json({ error: "Bad subscription." }, { status: 400 });
    const clean = { endpoint: String(sub.endpoint).slice(0, 800), keys: { p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 100) } };
    const plants = (Array.isArray(body.plants) ? body.plants : []).slice(0, 200).map(p => ({
      id: String(p.id).slice(0, 40), name: String(p.name).slice(0, 60), next: Number(p.next) || 0,
    }));
    await store.setJSON(id, { subscription: clean, plants, lang: body.lang === "hi" ? "hi" : "en", updated: Date.now() });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Couldn't save reminders. Try again." }, { status: 500 });
  }
};

export const config = { path: "/api/reminders", method: "POST", rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] } };
