"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, FlaskConical, Lightbulb, Share2, ShieldAlert, Sparkles } from "lucide-react";
import type { BodyRatings, FaceRatings, HairRatings } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import { useAIStatus } from "@/lib/api";
import { useAnalysis } from "@/lib/useAnalysis";
import { heDate } from "@/lib/utils";
import { Badge, Button, Card, ErrorBox, SectionTitle, Spinner } from "./ui";
import { TrendArea } from "./charts";

type Scope = "face" | "hair" | "body";
type Item = { score: number; note: string; tip: string };
type Result = { scope: Scope; photoUsable: boolean; photoQuality: "low" | "ok" | "good"; summary: string } & Record<string, unknown>;

const TILES: Record<Scope, { key: string; label: string }[]> = {
  face: [
    { key: "overall", label: "כללי" },
    { key: "potential", label: "פוטנציאל" },
    { key: "jawline", label: "קו לסת" },
    { key: "cheekbones", label: "עצמות לחי" },
    { key: "skin", label: "מראה העור" },
    { key: "grooming", label: "טיפוח" },
    { key: "presentation", label: "" }, // label resolved from profile (masculinity / femininity)
  ],
  hair: [
    { key: "overall", label: "כללי" },
    { key: "condition", label: "מצב השיער" },
    { key: "volume", label: "נפח" },
    { key: "styleFit", label: "התאמת התספורת" },
    { key: "neatness", label: "סידור" },
  ],
  body: [
    { key: "overall", label: "כללי" },
    { key: "posture", label: "יציבה" },
    { key: "shoulders", label: "כתפיים" },
    { key: "upperBody", label: "פלג עליון" },
    { key: "core", label: "ליבה" },
    { key: "lowerBody", label: "פלג תחתון" },
  ],
};
const TITLES: Record<Scope, string> = { face: "דירוגי פנים", hair: "דירוגי שיער", body: "דירוגי גוף" };

/**
 * Photo ratings: adults only, behind the explicit "personal mode" switch in Settings, and only with real AI.
 * Demo mode cannot rate a photo and never pretends to.
 */
export function PhotoRatings({ scope, image }: { scope: Scope; image: Blob | null }) {
  const ai = useAIStatus();
  const age = useStore((s) => s.profile?.age ?? 0);
  const gender = useStore((s) => s.profile?.gender);
  const enabled = useStore((s) => s.advancedRatings);
  const analyses = useStore((s) => s.analyses);
  const { run, loading, error } = useAnalysis("ratings");
  const [consent, setConsent] = useState(false);
  const [shared, setShared] = useState(false);

  const history = useMemo(
    () => analyses.filter((a) => a.type === "ratings" && a.result?.scope === scope && a.result?.photoUsable).slice().reverse(),
    [analyses, scope],
  );
  const last = analyses.find((a) => a.type === "ratings" && a.result?.scope === scope);
  const r = last?.result as Result | undefined;
  const trend = history.map((a) => ({ label: heDate(a.date), value: (a.result.overall as Item).score }));

  if (age < 18) {
    return (
      <Card className="flex items-start gap-3 text-sm text-muted">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-accent" />
        <span>דירוגי תמונה מספריים זמינים רק מגיל 18.</span>
      </Card>
    );
  }
  if (!enabled) {
    return (
      <Card className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>{TITLES[scope]} (18+) כבויים כברירת מחדל. אפשר להפעיל &quot;מצב אישי&quot; בהגדרות.</span>
        <Link href="/settings" className="inline-flex min-h-11 items-center text-accent">
          להגדרות
        </Link>
      </Card>
    );
  }

  const labelFor = (key: string, label: string) => (key === "presentation" ? (gender === "female" ? "נשיות" : "גבריות") : label);

  async function share() {
    if (!r) return;
    const text = `GLOWUP AI · ${TITLES[scope]}\n` + TILES[scope].map((t) => (r[t.key] ? `${labelFor(t.key, t.label)}: ${(r[t.key] as Item).score}` : null)).filter(Boolean).join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* cancelled or blocked */
    }
  }

  return (
    <Card>
      <SectionTitle>{TITLES[scope]} (18+)</SectionTitle>
      {!ai.loading && !ai.aiEnabled ? (
        <div className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          <span>דירוג תמונה דורש AI מחובר. מצב הדמו לא מסוגל לדרג תמונה, ולכן לא מוצגים ציונים. הגדירו ANTHROPIC_API_KEY.</span>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            הערכה סובייקטיבית של ה-AI מתמונה אחת. תאורה, זווית ופוזה משפיעות מאוד, ולכן הציון יכול להשתנות בין תמונות. לעקוב אחרי המגמה, צלמו כל פעם באותם תנאים.
          </p>
          <label className="mb-3 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            אני בן/בת 18 ומעלה, ומאשר/ת לשלוח את התמונה לדירוג AI
          </label>
          {error && <ErrorBox message={error} />}
          {loading ? (
            <Spinner label="ה-AI מדרג…" />
          ) : (
            <Button className="w-full" disabled={!image || !consent} icon={<Sparkles className="size-4" />} onClick={() => run({ image, extra: { scope }, demo: () => null })}>
              דרג את התמונה
            </Button>
          )}
          {!image && <p className="mt-2 text-center text-xs text-dim">העלו תמונה למעלה כדי לדרג</p>}
        </>
      )}

      {r && (
        <div className="mt-5">
          {!r.photoUsable ? (
            <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">{r.summary}</p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                איכות התמונה: <Badge tone={r.photoQuality === "good" ? "green" : r.photoQuality === "ok" ? "default" : "warn"}>{{ low: "נמוכה", ok: "סבירה", good: "טובה" }[r.photoQuality]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TILES[scope].map(({ key, label }) => {
                  const it = r[key] as Item | null | undefined;
                  if (!it) return null;
                  const name = labelFor(key, label);
                  return (
                    <div key={key} className="flex flex-col rounded-2xl border border-line bg-surface-2/70 p-4">
                      <div className="text-xs text-muted">{name}</div>
                      <div className="mt-1 text-3xl font-bold tabular-nums">{it.score}</div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${name}: ${it.score}`}>
                        <div className="h-full rounded-full bg-gradient-to-l from-cyan to-accent" style={{ width: `${it.score}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-dim">{it.note}</p>
                      <p className="mt-1.5 flex gap-1 text-[11px] leading-snug text-accent-strong">
                        <Lightbulb className="mt-0.5 size-3 shrink-0" /> {it.tip}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-muted">{r.summary}</p>
              {trend.length > 1 && (
                <div className="mt-4">
                  <div className="mb-1 text-xs text-muted">מגמת הציון הכללי בין סריקות</div>
                  <TrendArea data={trend} color="var(--green)" />
                </div>
              )}
              <button onClick={share} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted hover:text-fg">
                {shared ? <Check className="size-4 text-green" /> : <Share2 className="size-4" />}
                {shared ? "הועתק" : "שתפו עם חברים"}
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export type { FaceRatings, HairRatings, BodyRatings };
