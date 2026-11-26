"use client";
import { useEffect, useState } from "react";
import { Server } from "lucide-react";

type H = { id: string; status: string; lastError: { kind: string; status: number | null } | null; success: number; requests: number };
type S = { aiEnabled: boolean; keysSeen?: string[]; health?: H[]; order?: string[]; deployment?: string | null; environment?: string | null } | "noserver" | null;
const LABEL: Record<string, string> = { anthropic: "Anthropic", gemini: "Gemini", groq: "Groq", openrouter: "OpenRouter" };
const KIND: Record<string, string> = {
  auth: "המפתח לא תקין: צור מפתח חדש, הדבק אותו ב-Vercel בלי רווחים, ועשה Redeploy",
  rate_limit: "עומס או מגבלת קצב, ייפתח שוב בעוד דקה",
  quota: "המכסה החינמית להיום נגמרה",
  model_unavailable: "המודל לא זמין בחשבון",
  unsupported: "הבקשה גדולה מדי לתוכנית החינמית",
  network: "אין חיבור לספק",
  timeout: "הספק לא ענה בזמן",
  overloaded: "הספק עמוס",
  server: "שגיאה אצל הספק",
  invalid_output: "תשובה לא תקינה מהמודל",
  bad_request: "הבקשה נדחתה",
};

/** Shows what the server actually sees: which provider keys exist (never their values) and which version is deployed. */
export function ServerCheck() {
  const [s, setS] = useState<S>(null);
  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : "noserver"))
      .then(setS)
      .catch(() => setS("noserver"));
  }, []);
  if (!s) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3 text-xs text-muted">
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-fg"><Server className="size-3.5" /> בדיקת שרת</div>
      {s === "noserver" ? (
        <p>אין כאן שרת: זו גרסת התצוגה (למשל הקישור של Claude), והיא תמיד במצב דמו. כדי להשתמש ב-AI פותחים את הכתובת של האתר ב-Vercel.</p>
      ) : (
        <ul className="space-y-0.5">
          <li>מפתחות שהשרת רואה: {s.keysSeen?.length ? s.keysSeen.map((k) => LABEL[k] ?? k).join(", ") : <b className="text-danger">אף אחד</b>}</li>
          {s.order && <li dir="ltr" className="text-start">AI_PROVIDERS: {s.order.join(", ")}</li>}
          {s.health?.map((h) => (
            <li key={h.id}>
              {LABEL[h.id] ?? h.id}:{" "}
              {h.lastError && h.success === 0 ? <b className="text-danger">{KIND[h.lastError.kind] ?? h.lastError.kind}</b> : h.success > 0 ? <span className="text-green">עובד ({h.success}/{h.requests} בקשות הצליחו)</span> : "עוד לא נבדק בבקשה אמיתית"}
            </li>
          ))}
          <li>גרסה: <code dir="ltr">{s.deployment ?? "local"}</code>{s.environment ? ` · ${s.environment}` : ""}</li>
          {!s.keysSeen?.length && s.environment && <li>אם הוספת מפתחות: ודא/י ששם המשתנה מדויק (למשל GEMINI_API_KEY), שהוא מסומן ל-{s.environment === "production" ? "Production" : s.environment}, ושעשית Redeploy אחרי השמירה.</li>}
        </ul>
      )}
    </div>
  );
}
