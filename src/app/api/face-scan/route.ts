import { aiEnabled, analyzeFaceScan } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { FaceScanRequest } from "@/lib/schemas";

export const maxDuration = 180;

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const body = FaceScanRequest.parse(await req.json());
    return Response.json({ source: "ai", report: await analyzeFaceScan(body) });
  } catch (err) {
    return errorResponse(err);
  }
}
