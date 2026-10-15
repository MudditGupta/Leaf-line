// Saves (or removes) one device's push subscription and its plants' next watering dates.
import { getStore } from "@netlify/blobs";

export default async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.deviceId || "");
    if (!/^[a-z0-9-]{8,64}$/i.test(id)) return Response.json({ error: "Bad device id." }, { status: 400 });
    const store = getStore("reminders");
    if (!body.subscription) { await store.delete(id); return Response.json({ ok: true, off: true }); }
    const sub = body.subscription;
    if (typeof sub?.endpoint !== "string" || !sub.endpoint.startsWith("https://")) return Response.json({ error: "Bad subscription." }, { status: 400 });
    const plants = (Array.isArray(body.plants) ? body.plants : []).slice(0, 200).map(p => ({
      id: String(p.id).slice(0, 40), name: String(p.name).slice(0, 60), next: Number(p.next) || 0,
    }));
    await store.setJSON(id, { subscription: sub, plants, lang: body.lang === "hi" ? "hi" : "en", updated: Date.now() });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Couldn't save reminders. Try again." }, { status: 500 });
  }
};

export const config = { path: "/api/reminders", method: "POST" };
