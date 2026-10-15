// Anonymous usage events. Each event is its own key (no counters), so nothing is ever overwritten.
import { getStore } from "@netlify/blobs";

const EVENTS = new Set(["open", "scan_identify", "scan_health", "scan_fail", "save_plant", "water", "ask", "share", "reminders_on", "reminders_off", "calendar", "profile", "lang"]);
const clean = (v, n = 24) => String(v || "na").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, n) || "na";

export default async (req, context) => {
  try {
    const b = await req.json().catch(() => ({}));
    if (!EVENTS.has(b.event)) return new Response(null, { status: 204 });
    const day = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST day
    const city = clean(context.geo?.city, 30);
    const key = `ev/${day}/${b.event}/${clean(b.profile, 10)}/${clean(b.lang, 4)}/${clean(b.deviceId, 64)}/${city}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await getStore("analytics").set(key, "");
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};

export const config = { path: "/api/track", method: "POST" };
