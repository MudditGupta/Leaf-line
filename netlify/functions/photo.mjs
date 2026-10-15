// Plant photos for signed-in users, stored privately per user.
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const id = String(context.params.id || "");
  if (!/^[a-z0-9_-]{1,40}$/i.test(id)) return new Response("Bad id", { status: 400 });
  const store = getStore("photos");
  const key = `${user.id}/${id}`;
  if (req.method === "GET") {
    const data = await store.get(key, { type: "arrayBuffer" });
    if (!data) return new Response("Not found", { status: 404 });
    return new Response(data, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } });
  }
  if (req.method === "DELETE") { await store.delete(key); return new Response(null, { status: 204 }); }
  const buf = await req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > 1_500_000) return new Response("Photo too large", { status: 413 });
  const head = new Uint8Array(buf.slice(0, 3));
  if (head[0] !== 0xff || head[1] !== 0xd8) return new Response("JPEG only", { status: 415 });
  await store.set(key, buf);
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/photo/:id", method: ["GET", "PUT", "DELETE"], rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ["ip", "domain"] } };
