import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";
import { AIError } from "./server";

export function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return Response.json({ error: "בקשה לא תקינה", details: err.issues.slice(0, 3) }, { status: 400 });
  }
  if (err instanceof AIError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof Anthropic.AuthenticationError)
    return Response.json({ error: "מפתח ה-API אינו תקין. בדקו את ANTHROPIC_API_KEY." }, { status: 401 });
  if (err instanceof Anthropic.RateLimitError)
    return Response.json({ error: "יותר מדי בקשות כרגע. נסו שוב בעוד דקה." }, { status: 429 });
  if (err instanceof Anthropic.BadRequestError) {
    console.error("[ai] bad request", err.message);
    return Response.json({ error: "הבקשה ל-AI נדחתה (ייתכן שהתמונה גדולה או בפורמט לא נתמך)." }, { status: 400 });
  }
  if (err instanceof Anthropic.APIConnectionError)
    return Response.json({ error: "אין חיבור לשירות ה-AI. בדקו חיבור רשת." }, { status: 503 });
  if (err instanceof Anthropic.APIError) {
    console.error("[ai] api error", err.status, err.message);
    return Response.json({ error: "שגיאה בשירות ה-AI. נסו שוב." }, { status: 502 });
  }
  console.error("[ai] unexpected", err);
  return Response.json({ error: "שגיאה לא צפויה בשרת" }, { status: 500 });
}

export function noAI() {
  return Response.json(
    { error: "AI לא מוגדר בשרת. הגדירו ANTHROPIC_API_KEY או השתמשו במצב דמו.", demo: true },
    { status: 503 },
  );
}

/** Human-readable (Hebrew) message for errors that happen mid-stream. */
export async function errorMessage(err: unknown): Promise<string> {
  const data = await errorResponse(err).json().catch(() => ({}));
  return data.error || "שגיאה בחיבור ל-AI";
}
