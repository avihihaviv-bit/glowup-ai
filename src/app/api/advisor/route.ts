import { aiEnabled, adviseProducts } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { AdviceRequest } from "@/lib/schemas";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const body = AdviceRequest.parse(await req.json());
    return Response.json({ source: "ai", advice: await adviseProducts(body) });
  } catch (err) {
    return errorResponse(err);
  }
}
