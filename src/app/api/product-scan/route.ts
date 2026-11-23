import { z } from "zod";
import { aiEnabled, readProductLabel } from "@/lib/ai/server";
import { errorResponse, noAI } from "@/lib/ai/http";
import { ProfileContext } from "@/lib/schemas";
import { obfByBarcode } from "@/lib/obf";

export const maxDuration = 60;

const Body = z.object({
  image: z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(7_000_000) }),
  profile: ProfileContext.optional(),
});

export async function POST(req: Request) {
  if (!aiEnabled()) return noAI();
  try {
    const { image, profile } = Body.parse(await req.json());
    const label = await readProductLabel(image, profile);
    let db = null;
    try {
      db = label.barcode ? await obfByBarcode(label.barcode.replace(/\D/g, "")) : null;
    } catch {
      db = null;
    }
    return Response.json({ label, db });
  } catch (err) {
    return errorResponse(err);
  }
}
