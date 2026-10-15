// Runs every morning at 9:00 AM IST (03:30 UTC) and pushes "your plants are thirsty" notifications.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { PUSH_HOSTS } from "../lib/push.mjs";

export default async () => {
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY"), priv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) { console.log("VAPID keys missing"); return; }
  webpush.setVapidDetails("mailto:hello@leaf-line.netlify.app", pub, priv);
  const store = getStore("reminders");
  const { blobs } = await store.list();
  const endOfToday = Date.now() + 15 * 3600 * 1000; // 9am IST + 15h ≈ midnight IST
  let sent = 0, removed = 0;
  for (const { key } of blobs) {
    const rec = await store.get(key, { type: "json" });
    if (!rec?.subscription) continue;
    try { if (!PUSH_HOSTS.test(new URL(rec.subscription.endpoint).hostname)) { await store.delete(key); continue; } } catch { await store.delete(key); continue; }
    const due = (rec.plants || []).filter(p => p.next && p.next <= endOfToday);
    if (!due.length) continue;
    const names = due.map(p => p.name);
    const hi = rec.lang === "hi";
    const title = hi ? `🌿 ${names.length} पौधों को पानी चाहिए` : `🌿 ${names.length === 1 ? names[0] + " is" : names.length + " plants are"} thirsty`;
    const body = hi ? `${names.slice(0, 3).join(", ")} को आज पानी दें।` : `Water ${names.slice(0, 3).join(", ")}${names.length > 3 ? " and more" : ""} today.`;
    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify({ title, body, url: due.length === 1 ? `/?plant=${encodeURIComponent(due[0].id)}` : "/" }), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await store.delete(key); removed++; }
      else console.log("push failed", e.statusCode, e.body);
    }
  }
  console.log(`reminders: sent ${sent}, removed ${removed}, devices ${blobs.length}`);
};

export const config = { schedule: "30 3 * * *" }; // 03:30 UTC = 09:00 IST (India has no DST)
