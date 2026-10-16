// Server-side analytics for scans: which plants, which problems, which errors.
// One blob key per event (no counters), counted later by the stats page.
import { getStore } from "@netlify/blobs";

const day = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const slug = (s, n = 40) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, n) || "unknown";
const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const put = async (key) => { try { await getStore("analytics").set(key, ""); } catch {} };

// Plants identified (mode=identify) or diagnosed (mode=health)
export const recordPlant = (mode, name, profile) => put(`pl/${day()}/${mode === "health" ? "health" : "id"}/${slug(profile, 10)}/${slug(name)}/${stamp()}`);
// Health problems found (status minor/serious only)
export const recordProblem = (status, headline) => put(`hp/${day()}/${slug(status, 10)}/${slug(headline, 50)}/${stamp()}`);
// Why a scan failed
export const recordError = (code) => put(`er/${day()}/${slug(code, 20)}/${stamp()}`);
