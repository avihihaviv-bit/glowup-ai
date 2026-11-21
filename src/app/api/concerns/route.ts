import { aiEnabled, analyzeConcern } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { ConcernAnalyzeRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const body = ConcernAnalyzeRequest.parse(await req.json());
    return Response.json({ source: "ai", analysis: await analyzeConcern(body) });
  } catch (err) {
    return errorResponse(err);
  }
}
