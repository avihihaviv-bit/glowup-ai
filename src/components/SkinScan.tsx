"use client";
import { useState } from "react";
import { Sparkles, ShieldCheck, FlaskConical } from "lucide-react";
import type { SkinScan as SkinScanT } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import { fetchStatus, postJSON, profileContext, useAIStatus } from "@/lib/api";
import { blobToBase64, saveImage } from "@/lib/images";
import { measureImageQuality } from "@/lib/demo";
import { dateKey, heDate, uid, cn } from "@/lib/utils";
import { Badge, Button, Card, ErrorBox, SectionTitle, Spinner } from "./ui";
import { ImageUploader } from "./ImageUploader";
import { SourceLinks } from "./SourceLinks";

type Area = "forehead" | "leftCheek" | "rightCheek" | "chin";
const AREAS: { id: Area; label: string }[] = [
  { id: "forehead", label: "מצח" },
  { id: "leftCheek", label: "לחי שמאל" },
  { id: "rightCheek", label: "לחי ימין" },
  { id: "chin", label: "סנטר" },
];
const LEVEL: Record<string, { label: string; tone: "default" | "accent" | "warn" }> = {
  none: { label: "לא נראה", tone: "default" },
  mild: { label: "קל", tone: "accent" },
  noticeable: { label: "נראה", tone: "warn" },
  unclear: { label: "לא ברור", tone: "default" },
};
const TRAITS: { key: keyof SkinScanT["areas"][number]; label: string }[] = [
  { key: "acneLike", label: "דמוי אקנה" },
  { key: "redness", label: "אדמומיות" },
  { key: "dryness", label: "יובש" },
  { key: "oiliness", label: "שמנוניות" },
  { key: "texture", label: "מרקם" },
  { key: "marks", label: "סימנים" },
];

export function SkinScanPanel() {
  const ai = useAIStatus();
  const add = useStore((s) => s.addAnalysis);
  const last = useStore((s) => s.analyses.find((a) => a.type === "skinScan"));
  const [imgs, setImgs] = useState<Partial<Record<Area, Blob | null>>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [quality, setQuality] = useState<Partial<Record<Area, string>>>({});
  const chosen = AREAS.filter((a) => imgs[a.id]);
  const r = last?.result as SkinScanT | undefined;

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const q: Partial<Record<Area, string>> = {};
      for (const a of chosen) {
        const m = await measureImageQuality(imgs[a.id]!);
        q[a.id] = m.brightness < 60 ? "חשוכה" : m.sharpness < 60 ? "מטושטשת" : "תקינה";
      }
      setQuality(q);
      const { aiEnabled } = await fetchStatus();
      if (!aiEnabled) return;
      const images = await Promise.all(chosen.map(async (a) => ({ area: a.id, image: { mediaType: "image/jpeg" as const, data: await blobToBase64(imgs[a.id]!) } })));
      const res = await postJSON<{ result: SkinScanT }>("/api/analyze", { type: "skinScan", images, profile: profileContext(useStore.getState().profile) });
      const imageId = imgs.forehead ? await saveImage(imgs.forehead) : undefined;
      add({ id: uid("an"), type: "skinScan", date: dateKey(), source: "ai", imageId, result: res.result });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>סריקת עור לפי אזורים</SectionTitle>
        <p className="mb-4 text-sm text-muted">צילום קרוב באור יום, בלי פילטרים ובלי איפור. מתוארים רק מאפיינים נראים. אין כאן אבחון של מחלות עור.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {AREAS.map((a) => (
            <div key={a.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
                {a.label}
                {quality[a.id] && <Badge tone={quality[a.id] === "תקינה" ? "green" : "warn"}>{quality[a.id]}</Badge>}
              </div>
              <ImageUploader value={imgs[a.id] ?? null} onChange={(b) => setImgs((x) => ({ ...x, [a.id]: b }))} hint={`צילום קרוב של ה${a.label}`} aspect="aspect-square" />
            </div>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-white p-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            מאשר/ת שליחת התמונות לניתוח AI בשרת, לצורך הניתוח הזה בלבד.
            <span className="mt-1 flex items-center gap-1 text-xs text-dim">
              <ShieldCheck className="size-3.5 text-green" /> התמונות לא נשמרות בשרת.
            </span>
          </span>
        </label>
        {!ai.loading && !ai.aiEnabled && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-warn-bg p-3 text-sm text-warn">
            <FlaskConical className="mt-0.5 size-4 shrink-0" /> מצב דמו: נבדקת רק איכות התמונות. ניתוח המאפיינים דורש AI מחובר, ולכן לא יוצגו תוצאות מומצאות.
          </div>
        )}
        {err && (
          <div className="mt-3">
            <ErrorBox message={err} onRetry={run} />
          </div>
        )}
        <Button className="mt-4 w-full" size="lg" disabled={!chosen.length || (ai.aiEnabled && !consent)} loading={busy} icon={<Sparkles className="size-4" />} onClick={run}>
          {ai.aiEnabled ? `ניתוח ${chosen.length || ""} אזורים` : "בדיקת איכות התמונות"}
        </Button>
      </Card>

      {busy && <Spinner label="מנתחים…" />}
      {r && last && (
        <div className="space-y-4">
          <div className="text-sm text-muted">ניתוח אחרון: {heDate(last.date)}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {r.areas.map((a) => (
              <Card key={a.area} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{AREAS.find((x) => x.id === a.area)?.label}</span>
                  <Badge tone={a.confidence === "high" ? "green" : "default"}>ביטחון {{ low: "נמוך", medium: "בינוני", high: "גבוה" }[a.confidence]}</Badge>
                </div>
                {!a.usable ? (
                  <p className="mt-2 text-sm text-warn">התמונה לא הייתה שמישה לניתוח.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {TRAITS.map((t) => {
                      const v = String(a[t.key]);
                      return (
                        <div key={t.key} className={cn("rounded-xl border p-2 text-center", v === "noticeable" ? "border-warn/40 bg-warn-bg" : "border-line bg-surface-2")}>
                          <div className="text-[11px] text-dim">{t.label}</div>
                          <div className="text-xs font-semibold">{LEVEL[v]?.label ?? v}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-sm text-muted">{a.note}</p>
              </Card>
            ))}
          </div>
          <Card>
            <SectionTitle>הצעדים הבאים</SectionTitle>
            <p className="mb-2 text-sm text-muted">{r.overall}</p>
            <ul className="space-y-1 text-sm text-muted">
              {r.nextSteps.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>
            <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm text-muted">{r.dermatologistNote}</p>
            <SourceLinks topic="skin" />
          </Card>
        </div>
      )}
    </div>
  );
}
