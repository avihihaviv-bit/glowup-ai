import { obfSearch } from "@/lib/obf";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) return Response.json({ results: [] });
  try {
    return Response.json({ results: await obfSearch(q) });
  } catch {
    return Response.json({ results: [], error: "מאגר המוצרים לא זמין כרגע" }, { status: 503 });
  }
}
