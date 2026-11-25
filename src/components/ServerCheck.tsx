"use client";
import { useEffect, useState } from "react";
import { Server } from "lucide-react";

type S = { aiEnabled: boolean; keysSeen?: string[]; order?: string[]; deployment?: string | null; environment?: string | null } | "noserver" | null;
const LABEL: Record<string, string> = { anthropic: "Anthropic", gemini: "Gemini", groq: "Groq", openrouter: "OpenRouter" };

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
          <li>גרסה: <code dir="ltr">{s.deployment ?? "local"}</code>{s.environment ? ` · ${s.environment}` : ""}</li>
          {!s.keysSeen?.length && s.environment && <li>אם הוספת מפתחות: ודא/י ששם המשתנה מדויק (למשל GEMINI_API_KEY), שהוא מסומן ל-{s.environment === "production" ? "Production" : s.environment}, ושעשית Redeploy אחרי השמירה.</li>}
        </ul>
      )}
    </div>
  );
}
