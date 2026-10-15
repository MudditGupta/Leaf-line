// Daily scan/question limits. Each use is its own blob key (no counters to race on);
// we count keys under a prefix. Limits can be changed in Netlify env vars without code changes.
import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const num = (k, d) => { const v = Number(Netlify.env.get(k)); return Number.isFinite(v) && v >= 0 ? v : d; };
export const LIMITS = () => ({
  guest: num("GUEST_DAILY_SCANS", 3),       // per phone, not signed in
  member: num("MEMBER_DAILY_SCANS", 15),    // per signed-in account
  perIp: num("IP_DAILY_SCANS", 40),         // per network, stops abuse with fake device ids
  total: num("TOTAL_DAILY_SCANS", 300),     // whole app per day, protects the free AI tier
  asks: num("DAILY_QUESTIONS", 20),         // questions per person per day
});
const istDay = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const clean = (v) => String(v || "").replace(/[^a-z0-9-]/gi, "").slice(0, 64);
const count = async (store, prefix) => (await store.list({ prefix })).blobs.length;

export class QuotaError extends Error {
  constructor(code, message, extra = {}) { super(message); this.status = 429; this.code = code; Object.assign(this, extra); }
}

// kind: "scan" | "ask". Throws QuotaError when over; returns { who, left } and records the use.
export async function useQuota(req, context, kind, deviceId) {
  const L = LIMITS();
  const user = await getUser().catch(() => null);
  const who = user ? `u-${clean(user.id)}` : `d-${clean(deviceId) || "unknown"}`;
  const ip = clean((context?.ip || "").replace(/[.:]/g, "-")) || "noip";
  const day = istDay();
  const store = getStore({ name: "quota", consistency: "strong" });

  if (kind === "ask") {
    const used = await count(store, `${day}/ask/${who}/`);
    if (used >= L.asks) throw new QuotaError("ask_limit", "You've asked a lot today. Questions reset at midnight.");
    await store.set(`${day}/ask/${who}/${Date.now()}`, "");
    return { who, left: L.asks - used - 1 };
  }

  const [mine, net, all] = await Promise.all([
    count(store, `${day}/scan/who/${who}/`),
    count(store, `${day}/scan/ip/${ip}/`),
    count(store, `${day}/scan/all/`),
  ]);
  if (all >= L.total) throw new QuotaError("app_limit", "Leafline is very busy today. Scans reset at midnight. Please try tomorrow.");
  const mineLimit = user ? L.member : L.guest;
  if (mine >= mineLimit) {
    throw user
      ? new QuotaError("member_limit", `You've used your ${L.member} scans for today. They reset at midnight.`)
      : new QuotaError("guest_limit", `You've used your ${L.guest} free scans for today. Sign in free to get ${L.member} a day.`, { signIn: true });
  }
  if (net >= L.perIp) throw new QuotaError("ip_limit", "Too many scans from this network today. Try again tomorrow.");
  const t = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await Promise.all([
    store.set(`${day}/scan/who/${who}/${t}`, ""),
    store.set(`${day}/scan/ip/${ip}/${t}`, ""),
    store.set(`${day}/scan/all/${t}`, ""),
  ]);
  return { who, left: Math.max(0, mineLimit - mine - 1), member: !!user };
}

// Undo a recorded scan when the AI call fails, so people aren't charged for errors.
export async function refundScan(who, context) {
  try {
    const store = getStore({ name: "quota", consistency: "strong" });
    const day = istDay();
    const { blobs } = await store.list({ prefix: `${day}/scan/who/${who}/` });
    const last = blobs.map(b => b.key).sort().pop();
    if (!last) return;
    const t = last.split("/").pop();
    const ip = clean((context?.ip || "").replace(/[.:]/g, "-")) || "noip";
    await Promise.all([store.delete(last), store.delete(`${day}/scan/ip/${ip}/${t}`), store.delete(`${day}/scan/all/${t}`)]);
  } catch {}
}
