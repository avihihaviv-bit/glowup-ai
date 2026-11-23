import { z } from "zod";

export const maxDuration = 120;

const Body = z.object({
  image: z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(7_000_000) }),
  style: z.string().min(2).max(120),
  details: z.string().max(400).default(""),
});

/**
 * Hairstyle preview through OpenAI's image edit API (server-side key only).
 * The output is a simulation, and the UI says it is not a guaranteed real-life result.
 */
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: "תצוגת תסרוקת דורשת OPENAI_API_KEY בשרת (Claude לא יוצר תמונות)." }, { status: 503 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const bytes = Buffer.from(body.image.data, "base64");
  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
  form.append("image", new Blob([bytes], { type: body.image.mediaType }), "photo.jpg");
  form.append(
    "prompt",
    `Change ONLY the hairstyle of the person in this photo to: ${body.style}. ${body.details} Keep the same person, face, facial features, skin tone, expression, clothing, background, lighting and camera angle exactly as they are. Realistic photo, natural hair texture. Do not beautify or alter the face.`,
  );
  form.append("size", "1024x1024");
  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const status = res.status === 401 ? 401 : res.status === 429 ? 429 : 502;
      const msg = res.status === 401 ? "מפתח OPENAI_API_KEY אינו תקין." : res.status === 429 ? "יותר מדי בקשות לשירות התמונות. נסו שוב בעוד דקה." : "שירות יצירת התמונות החזיר שגיאה.";
      console.error("[hair-preview]", res.status, data?.error?.message);
      return Response.json({ error: msg }, { status });
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return Response.json({ error: "לא התקבלה תמונה מהשירות." }, { status: 502 });
    return Response.json({ image: `data:image/png;base64,${b64}` });
  } catch {
    return Response.json({ error: "אין חיבור לשירות יצירת התמונות." }, { status: 503 });
  }
}
