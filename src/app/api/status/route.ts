import { connection } from "next/server";
import { aiEnabled } from "@/lib/ai/server";
import { getRouter } from "@/lib/ai/router";

export async function GET() {
  await connection();
  const enabled = aiEnabled();
  let model: string | null = null;
  const router = getRouter();
  if (enabled) {
    const snap = router.snapshot();
    const p = snap.providers.find((x) => x.id === (snap.active ?? snap.primary));
    model = p ? `${p.label}${p.models?.balanced[0] ? ` · ${p.models.balanced[0]}` : ""}` : null;
  }
  return Response.json(
    {
      aiEnabled: enabled,
      model,
      imageGen: Boolean(process.env.OPENAI_API_KEY),
      // Diagnostics: only WHICH providers have a key (never the key), the provider order and the deployed commit.
      keysSeen: router.cfg.providers.filter((p) => p.keys.length > 0).map((p) => p.id),
      order: router.cfg.order,
      deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
