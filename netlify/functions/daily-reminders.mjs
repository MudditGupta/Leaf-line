// Runs every hour at :30 UTC (= :00 India time) and sends each phone its reminder at the hour the user picked.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { PUSH_HOSTS } from "../lib/push.mjs";

export default async () => {
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY"), priv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) { console.log("VAPID keys missing"); return; }
  webpush.setVapidDetails("mailto:hello@leaf-line.netlify.app", pub, priv);
  const ist = new Date(Date.now() + 5.5 * 3600e3);
  const hour = ist.getUTCHours(), today = ist.toISOString().slice(0, 10);
  const endOfToday = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - 5.5 * 3600e3;
  const store = getStore("reminders");
  const { blobs } = await store.list();
  let sent = 0, removed = 0;
  for (const { key } of blobs) {
    const rec = await store.get(key, { type: "json" });
    if (!rec?.subscription || (rec.hour ?? 9) !== hour || rec.lastSent === today) continue;
    try { if (!PUSH_HOSTS.test(new URL(rec.subscription.endpoint).hostname)) { await store.delete(key); continue; } } catch { await store.delete(key); continue; }
    const water = (rec.plants || []).filter(p => p.next && p.next <= endOfToday).map(p => p.name);
    const feed = (rec.plants || []).filter(p => p.nextFeed && p.nextFeed <= endOfToday).map(p => p.name);
    if (!water.length && !feed.length) continue;
    const hi = rec.lang === "hi", n = water.length + feed.length;
    const title = hi ? `🌿 आज ${n} काम` : water.length === 1 && !feed.length ? `🌿 ${water[0]} is thirsty` : `🌿 ${n} plant ${n === 1 ? "task" : "tasks"} today`;
    const parts = [];
    if (water.length) parts.push(hi ? `पानी: ${water.slice(0, 3).join(", ")}` : `Water ${water.slice(0, 3).join(", ")}${water.length > 3 ? " and more" : ""}`);
    if (feed.length) parts.push(hi ? `खाद: ${feed.slice(0, 2).join(", ")}` : `Feed ${feed.slice(0, 2).join(", ")}${feed.length > 2 ? " and more" : ""}`);
    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify({ title, body: parts.join(hi ? " · " : ". ") + (hi ? "" : "."), url: "/?view=schedule" }), { TTL: 6 * 3600 });
      await store.setJSON(key, { ...rec, lastSent: today });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await store.delete(key); removed++; }
      else console.log("push failed", e.statusCode, e.body);
    }
  }
  console.log(`reminders ${today} ${hour}:00 IST: sent ${sent}, removed ${removed}, devices ${blobs.length}`);
};

export const config = { schedule: "30 * * * *" }; // every hour at :30 UTC = :00 IST (India has no DST)
