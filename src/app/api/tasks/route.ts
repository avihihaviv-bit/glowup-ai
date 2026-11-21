import { z } from "zod";
import { aiEnabled, generateDailyTasks } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { ProfileContext } from "@/lib/schemas";

export const maxDuration = 120;

const Body = z.object({
  profile: ProfileContext,
  context: z.string().max(4000).default(""),
  request: z.string().max(1000).default(""),
});

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const { profile, context, request } = Body.parse(await req.json());
    return Response.json({ source: "ai", ...(await generateDailyTasks(profile, context, request)) });
  } catch (err) {
    return errorResponse(err);
  }
}
