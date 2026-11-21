import { z } from "zod";
import { aiEnabled, generatePlan } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { ProfileContext } from "@/lib/schemas";

export const maxDuration = 300;

const Body = z.object({ profile: ProfileContext, context: z.string().max(4000).default("") });

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const { profile, context } = Body.parse(await req.json());
    return Response.json({ source: "ai", plan: await generatePlan(profile, context) });
  } catch (err) {
    return errorResponse(err);
  }
}
