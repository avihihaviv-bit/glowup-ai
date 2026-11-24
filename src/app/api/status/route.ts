import { connection } from "next/server";
import { aiEnabled } from "@/lib/ai/server";
import { getRouter } from "@/lib/ai/router";

export async function GET() {
  await connection();
  const enabled = aiEnabled();
  let model: string | null = null;
  if (enabled) {
    const snap = getRouter().snapshot();
    const p = snap.providers.find((x) => x.id === (snap.active ?? snap.primary));
    model = p ? `${p.label}${p.models?.balanced[0] ? ` · ${p.models.balanced[0]}` : ""}` : null;
  }
  return Response.json({ aiEnabled: enabled, model, imageGen: Boolean(process.env.OPENAI_API_KEY) });
}
