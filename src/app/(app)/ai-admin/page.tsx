"use client";
import { useCallback, useEffect, useState } from "react";
import { ServerCog, RefreshCw, PlayCircle, RotateCcw, KeyRound, Activity, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, Input, PageHeader, SectionTitle, Spinner } from "@/components/ui";

type Status = "available" | "cooldown" | "circuit_open" | "daily_limit" | "keys_unavailable" | "not_configured";
interface ProviderView {
  id: string;
  label: string;
  status: Status;
  reason: string | null;
  keys: { id: string; requests: number; success: number; failures: number; disabled: string | null; cooldownSec: number }[];
  separateQuota: boolean;
  models: { fast: string[]; balanced: string[]; deep: string[]; vision: string[] } | null;
  discovery: string;
  requests: number;
  success: number;
  failures: Record<string, number>;
  avgLatencyMs: number | null;
  inputTokens: number;
  outputTokens: number;
  todayRequests: number;
  dailyLimit: number | null;
  quota: { remainingRequests?: number; remainingTokens?: number; limitRequests?: number; resetRequests?: string; at: number } | null;
  lastError: { kind: string; status?: number; at: number; message: string } | null;
  lastSuccessAt: number | null;
  unavailableModels: string[];
}
interface LogView {
  at: number;
  requestId: string;
  task: string;
  provider: string;
  model?: string;
  keyId?: string;
  attempt: number;
  outcome: string;
  kind?: string;
  status?: number;
  latencyMs?: number;
  note?: string;
}
interface Snapshot {
  primary: string | null;
  active: string | null;
  order: string[];
  lastServed: { provider: string; model: string; at: number; task: string } | null;
  totalRequests: number;
  since: number;
  limits: { maxAttempts: number; deadlineMs: number; maxRetries: number; circuitThreshold: number };
  providers: ProviderView[];
  logs: LogView[];
  adminTokenRequired: boolean;
}

const STATUS: Record<Status, { label: string; tone: "green" | "accent" | "warn" | "danger" | "default" }> = {
  available: { label: "זמין", tone: "green" },
  cooldown: { label: "בהמתנה (מגבלה)", tone: "warn" },
  circuit_open: { label: "מושבת זמנית", tone: "danger" },
  daily_limit: { label: "הגיע למגבלה היומית", tone: "warn" },
  keys_unavailable: { label: "אין מפתח תקין", tone: "danger" },
  not_configured: { label: "לא מוגדר", tone: "default" },
};
const OUTCOME: Record<string, string> = { success: "הצלחה", error: "שגיאה", retry: "ניסיון חוזר", skip: "דילוג", stream_error: "שגיאה בזרם" };
const ENV: Record<string, string> = { anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", openrouter: "OPENROUTER_API_KEY" };
const time = (t: number) => new Date(t).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const TOKEN_KEY = "glowup-ai-admin-token";

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function AIAdminPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "auth" | "unavailable">("loading");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/ai/router", { headers: { "x-admin-token": readToken() }, cache: "no-store" });
      if (r.status === 401) return setState("auth");
      if (!r.ok) return setState("unavailable");
      setData(await r.json());
      setState("ok");
    } catch {
      setState("unavailable");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  async function act(provider: string, action: "test" | "reset") {
    setBusy(`${action}:${provider}`);
    try {
      const r = await fetch("/api/ai/router", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": readToken() }, body: JSON.stringify({ action, provider }) });
      const d = await r.json();
      setMsg((m) => ({ ...m, [provider]: action === "reset" ? "המצב אופס." : d.ok ? `✓ עובד (${d.latencyMs}ms${d.model ? ` · ${d.model}` : ""})` : `✗ ${d.error ?? "נכשל"}` }));
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול ספקי AI"
        subtitle="איזה ספק פעיל, כמה בקשות בוצעו, ומה זמין עכשיו. המפתחות נשמרים רק בשרת ולא מוצגים כאן."
        icon={<ServerCog className="size-5" />}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} onClick={load}>רענון</Button>}
      />

      {state === "loading" && <Spinner label="טוען…" />}
      {state === "unavailable" && (
        <Card className="text-sm text-muted">מסך הניהול זמין רק כשהאפליקציה רצה עם השרת שלה (למשל ב-Vercel). בגרסת הדמו אין שרת.</Card>
      )}
      {state === "auth" && (
        <Card className="max-w-md space-y-3">
          <SectionTitle><span className="flex items-center gap-2"><KeyRound className="size-4 text-accent" /> קוד מנהל</span></SectionTitle>
          <p className="text-sm text-muted">בשרת מוגדר AI_ADMIN_TOKEN. הזינו אותו כדי לצפות בנתונים. הוא נשמר רק בלשונית הזו.</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                sessionStorage.setItem(TOKEN_KEY, token);
              } catch {}
              load();
            }}
          >
            <Input id="admin-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} aria-label="קוד מנהל" autoComplete="off" />
            <Button type="submit">כניסה</Button>
          </form>
        </Card>
      )}

      {state === "ok" && data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="ספק פעיל עכשיו" value={data.providers.find((p) => p.id === data.active)?.label ?? "אין"} tone={data.active ? "green" : "danger"} />
            <Stat label="ספק ראשי" value={data.providers.find((p) => p.id === data.primary)?.label ?? "—"} />
            <Stat label="בקשות מאז ההפעלה" value={String(data.totalRequests)} />
            <Stat label="נענתה לאחרונה ע״י" value={data.lastServed ? `${data.providers.find((p) => p.id === data.lastServed!.provider)?.label}` : "—"} sub={data.lastServed ? `${data.lastServed.model} · ${time(data.lastServed.at)}` : undefined} />
          </div>

          <p className="text-xs text-dim">
            סדר המעבר: {data.order.map((id) => data.providers.find((p) => p.id === id)?.label ?? id).join(" ← ")} · עד {data.limits.maxAttempts} ניסיונות לבקשה · {data.limits.maxRetries} ניסיון חוזר לשגיאה זמנית · מפסק נפתח אחרי {data.limits.circuitThreshold} כשלונות. הנתונים נשמרים בזיכרון השרת ומתאפסים בהפעלה מחדש.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.providers.map((p) => {
              const st = STATUS[p.status];
              const fails = Object.entries(p.failures).filter(([, n]) => n > 0);
              return (
                <Card key={p.id} className={cn("space-y-3", p.id === data.active && "border-green/50")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        {p.label}
                        {p.id === data.active && <Badge tone="green">פעיל</Badge>}
                      </div>
                      <div className="text-xs text-dim" dir="ltr">{p.id}</div>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  {p.status === "not_configured" ? (
                    <p className="text-sm text-muted">כדי להפעיל: הוסיפו בשרת <code dir="ltr">{ENV[p.id] ?? `${p.id.toUpperCase()}_API_KEY`}</code> ופרסו מחדש.</p>
                  ) : (
                    <>
                      {p.reason && <p className="text-sm text-warn">{p.reason}</p>}
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <Mini label="בקשות" value={p.requests} />
                        <Mini label="הצלחה" value={p.requests ? `${Math.round((p.success / p.requests) * 100)}%` : "—"} />
                        <Mini label="זמן ממוצע" value={p.avgLatencyMs ? `${(p.avgLatencyMs / 1000).toFixed(1)}s` : "—"} />
                        <Mini label="היום" value={p.dailyLimit ? `${p.todayRequests}/${p.dailyLimit}` : p.todayRequests} />
                        <Mini label="טוקנים נכנסים" value={p.inputTokens.toLocaleString()} />
                        <Mini label="טוקנים יוצאים" value={p.outputTokens.toLocaleString()} />
                      </div>
                      {p.quota && (
                        <p className="text-xs text-muted">
                          מכסה לפי הספק: {p.quota.remainingRequests !== undefined && `${p.quota.remainingRequests} בקשות נותרו`}
                          {p.quota.limitRequests !== undefined && ` מתוך ${p.quota.limitRequests}`}
                          {p.quota.remainingTokens !== undefined && ` · ${p.quota.remainingTokens.toLocaleString()} טוקנים`}
                          {p.quota.resetRequests && ` · מתאפס בעוד ${p.quota.resetRequests}`}
                        </p>
                      )}
                      <div>
                        <div className="mb-1 text-xs font-semibold text-muted">מפתחות ({p.keys.length}){p.keys.length > 1 && (p.separateQuota ? " · מכסות נפרדות" : " · מכסה משותפת: גיבוי רק לשגיאת אימות")}</div>
                        <ul className="space-y-1">
                          {p.keys.map((k) => (
                            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-xs">
                              <code dir="ltr">{k.id}</code>
                              <span className="text-muted">
                                {k.requests} בקשות · {k.success} הצליחו
                                {k.disabled && <span className="text-danger"> · מושבת: {k.disabled}</span>}
                                {k.cooldownSec > 0 && <span className="text-warn"> · המתנה {k.cooldownSec}s</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {p.models && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" dir="ltr">
                          {(["fast", "balanced", "deep", "vision"] as const).map((t) => (
                            <div key={t} className="min-w-0 truncate">
                              <span className="text-dim">{t}: </span>
                              {p.models![t][0] ?? <span className="text-danger">none</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-dim">רשימת מודלים: {p.discovery}{p.unavailableModels.length > 0 && ` · לא זמינים: ${p.unavailableModels.join(", ")}`}</p>
                      {fails.length > 0 && <p className="text-xs text-muted">שגיאות: {fails.map(([k, n]) => `${k} ×${n}`).join(" · ")}</p>}
                      {p.lastError && (
                        <p className="rounded-xl bg-warn-bg p-2 text-xs text-warn [overflow-wrap:anywhere]" dir="ltr">
                          {time(p.lastError.at)} · {p.lastError.kind}
                          {p.lastError.status ? ` (${p.lastError.status})` : ""} · {p.lastError.message}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="secondary" icon={<PlayCircle className="size-4" />} loading={busy === `test:${p.id}`} onClick={() => act(p.id, "test")}>בדיקת חיבור</Button>
                        <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} loading={busy === `reset:${p.id}`} onClick={() => act(p.id, "reset")}>איפוס מצב</Button>
                        {msg[p.id] && <span className="text-xs text-muted">{msg[p.id]}</span>}
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          <Card>
            <SectionTitle><span className="flex items-center gap-2"><Activity className="size-4 text-accent" /> לוג אחרון</span></SectionTitle>
            {data.logs.length ? (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs" dir="ltr">
                  <thead className="text-dim">
                    <tr className="text-left">
                      <th className="p-2">time</th><th className="p-2">req</th><th className="p-2">task</th><th className="p-2">provider / model</th><th className="p-2">result</th><th className="p-2">ms</th><th className="p-2">note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((l, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="p-2 tabular-nums">{time(l.at)}</td>
                        <td className="p-2 text-dim">{l.requestId}</td>
                        <td className="p-2">{l.task}</td>
                        <td className="p-2">{l.provider}{l.model ? ` / ${l.model}` : ""}</td>
                        <td className="p-2">
                          <span className={cn("inline-flex items-center gap-1", l.outcome === "success" ? "text-green" : l.outcome === "skip" ? "text-dim" : "text-warn")}>
                            {l.outcome === "success" ? <CheckCircle2 className="size-3" /> : l.outcome === "retry" ? <Clock className="size-3" /> : l.outcome !== "skip" ? <AlertTriangle className="size-3" /> : null}
                            {OUTCOME[l.outcome] ?? l.outcome}
                            {l.kind && ` · ${l.kind}`}
                            {l.status ? ` ${l.status}` : ""}
                          </span>
                        </td>
                        <td className="p-2 tabular-nums">{l.latencyMs ?? ""}</td>
                        <td className="max-w-[260px] truncate p-2 text-dim" title={l.note}>{l.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">עוד אין בקשות. הלוג מציג רק מטא-דאטה (ספק, מודל, זמן ותוצאה), בלי תוכן הבקשות.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "danger" }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={cn("mt-1 truncate text-lg font-extrabold", tone === "green" && "text-green", tone === "danger" && "text-danger")}>{value}</div>
      {sub && <div className="truncate text-[11px] text-dim" dir="ltr">{sub}</div>}
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <div className="font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-dim">{label}</div>
    </div>
  );
}
