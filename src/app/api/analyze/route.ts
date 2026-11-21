import { aiEnabled, analyze } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { AnalyzeRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const body = AnalyzeRequest.parse(await req.json());
    return Response.json(await analyze(body));
  } catch (err) {
    return errorResponse(err);
  }
}
