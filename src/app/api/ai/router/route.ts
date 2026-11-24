import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { z } from "zod";
import { getRouter, RouterError } from "@/lib/ai/router";

/**
 * Admin endpoint for the AI router. Returns counters and health only: never keys, prompts or responses.
 * If AI_ADMIN_TOKEN is set, every call must send it in the x-admin-token header.
 */
function authorized(req: Request) {
  const token = process.env.AI_ADMIN_TOKEN;
  if (!token) return true;
  const got = req.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const deny = () => Response.json({ error: "נדרש קוד מנהל (AI_ADMIN_TOKEN)." }, { status: 401 });

export async function GET(req: Request) {
  await connection();
  if (!authorized(req)) return deny();
  return Response.json({ ...getRouter().snapshot(), adminTokenRequired: Boolean(process.env.AI_ADMIN_TOKEN) }, { headers: { "Cache-Control": "no-store" } });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset"), provider: z.string().max(30).optional() }),
  z.object({ action: z.literal("test"), provider: z.string().max(30) }),
]);

const lastTest = new Map<string, number>();

export async function POST(req: Request) {
  if (!authorized(req)) return deny();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const router = getRouter();
  if (body.action === "reset") {
    router.reset(body.provider);
    return Response.json({ ok: true });
  }
  // A test call is a real (tiny) paid request, so it's throttled per provider.
  const t = Date.now();
  if (t - (lastTest.get(body.provider) ?? 0) < 20_000) return Response.json({ error: "אפשר לבדוק ספק פעם ב-20 שניות." }, { status: 429 });
  lastTest.set(body.provider, t);
  if (!router.configured().some((p) => p.id === body.provider)) return Response.json({ error: "הספק לא מוגדר בשרת." }, { status: 400 });
  router.reset(body.provider); // a manual test should actually reach the provider
  const start = Date.now();
  try {
    const r = await router.generateObject({
      task: "admin-test",
      only: body.provider,
      tier: "fast",
      effort: "low",
      system: "You are a health check. Reply with the JSON object {\"ok\": true}.",
      parts: [{ type: "text", text: "ping" }],
      schema: z.object({ ok: z.boolean() }),
    });
    return Response.json({ ok: r.ok === true, latencyMs: Date.now() - start, model: router.snapshot().lastServed?.model });
  } catch (err) {
    const e = err as RouterError;
    return Response.json({ ok: false, error: e.message, kind: e.kind, latencyMs: Date.now() - start });
  }
}
