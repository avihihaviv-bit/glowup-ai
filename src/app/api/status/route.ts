import { connection } from "next/server";
import { aiEnabled, MODEL } from "@/lib/ai/server";

export async function GET() {
  await connection();
  return Response.json({ aiEnabled: aiEnabled(), model: aiEnabled() ? MODEL : null });
}
