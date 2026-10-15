// Private stats page: /stats?key=YOUR_STATS_KEY
import { getStore } from "@netlify/blobs";

const LABEL = { open: "App opens", scan_identify: "Plant IDs", scan_health: "Health checks", scan_fail: "Failed scans", save_plant: "Plants saved", water: "Waterings logged", ask: "Questions asked", share: "Shares", reminders_on: "Reminders turned on", reminders_off: "Reminders turned off", calendar: "Calendar adds", profile: "Profile picked", lang: "Language switched" };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default async (req) => {
  const key = Netlify.env.get("STATS_KEY");
  if (!key || new URL(req.url).searchParams.get("key") !== key) return new Response("Not found", { status: 404 });
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(Date.now() + 5.5 * 3600e3 - i * 864e5).toISOString().slice(0, 10));
  const store = getStore("analytics");
  const perDay = {}, totals = {}, devices = new Set(), profiles = {}, langs = {}, cities = {}, devDay = {};
  for (const d of days) {
    const { blobs } = await store.list({ prefix: `ev/${d}/` });
    perDay[d] = { users: new Set(), scans: 0 };
    for (const { key: k } of blobs) {
      const [, , ev, prof, lang, dev, city] = k.split("/");
      totals[ev] = (totals[ev] || 0) + 1;
      devices.add(dev); perDay[d].users.add(dev);
      if (ev.startsWith("scan_") && ev !== "scan_fail") perDay[d].scans++;
      if (!devDay[dev]) { devDay[dev] = true; profiles[prof] = (profiles[prof] || 0) + 1; langs[lang] = (langs[lang] || 0) + 1; if (city && city !== "na") cities[city] = (cities[city] || 0) + 1; }
    }
  }
  const max = Math.max(1, ...days.map(d => perDay[d].users.size));
  const today = days[days.length - 1], week = days.slice(-7);
  const weekUsers = new Set(); week.forEach(d => perDay[d].users.forEach(u => weekUsers.add(u)));
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `<li><span>${esc(k)}</span><b>${v}</b></li>`).join("") || "<li><span>No data yet</span></li>";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Leafline stats</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#EEF2EC;color:#13201A}main{max-width:720px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:28px;margin:0 0 4px}p.s{color:#55655B;margin:0 0 20px}.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}
.k{background:#fff;border-radius:18px;padding:16px}.k small{color:#55655B;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em}.k b{display:block;font-size:30px;margin-top:4px;font-variant-numeric:tabular-nums}
.card{background:#fff;border-radius:18px;padding:16px;margin-bottom:12px}.card h2{font-size:16px;margin:0 0 12px}
.bars{display:flex;align-items:flex-end;gap:3px;height:120px}.bars i{flex:1;background:#1E6B4C;border-radius:3px 3px 0 0;min-height:2px}
.ax{display:flex;justify-content:space-between;color:#55655B;font-size:11px;margin-top:6px}ul{list-style:none;margin:0;padding:0}li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #DCE3DC;font-size:14px}li:last-child{border:0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}</style></head><body><main>
<h1>Leafline stats</h1><p class="s">Last 30 days · anonymous devices · India time</p>
<div class="kpis"><div class="k"><small>Users today</small><b>${perDay[today].users.size}</b></div><div class="k"><small>Users this week</small><b>${weekUsers.size}</b></div>
<div class="k"><small>Users (30 days)</small><b>${devices.size}</b></div><div class="k"><small>Scans (30 days)</small><b>${(totals.scan_identify || 0) + (totals.scan_health || 0)}</b></div></div>
<div class="card"><h2>Daily users</h2><div class="bars">${days.map(d => `<i title="${d}: ${perDay[d].users.size} users, ${perDay[d].scans} scans" style="height:${Math.round(perDay[d].users.size / max * 100)}%"></i>`).join("")}</div><div class="ax"><span>${days[0]}</span><span>${today}</span></div></div>
<div class="grid"><div class="card"><h2>What people do</h2><ul>${Object.keys(LABEL).filter(k => totals[k]).map(k => `<li><span>${LABEL[k]}</span><b>${totals[k]}</b></li>`).join("") || "<li><span>No data yet</span></li>"}</ul></div>
<div class="card"><h2>Who they are</h2><ul>${top(profiles)}</ul><h2 style="margin-top:16px">Language</h2><ul>${top(langs)}</ul></div>
<div class="card"><h2>Top cities</h2><ul>${top(cities)}</ul></div></div></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config = { path: "/stats", method: "GET" };
