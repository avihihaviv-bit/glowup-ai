"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, RefreshCw, ScanFace, ShieldCheck, AlertTriangle } from "lucide-react";
import { prepareImage, saveImage, blobToBase64 } from "@/lib/images";
import { measureImageQuality } from "@/lib/demo";
import { detectImage } from "@/lib/face/landmarker";
import { captureIssues, frontObservations, ISSUE_TEXT, packLandmarks, poseCheck, type Issue, type P, type ScanStep } from "@/lib/face/metrics";
import { useStore } from "@/lib/store";
import { fetchStatus, postJSON, profileContext } from "@/lib/api";
import type { FaceScan, ScanImageQuality } from "@/lib/types";
import type { FaceScanReport } from "@/lib/schemas";
import { cn, dateKey, uid } from "@/lib/utils";
import { Badge, Button, Card, ErrorBox } from "../ui";
import { LiveCapture } from "./LiveCapture";

const STEPS: { id: ScanStep; title: string; hint: string; optional: boolean }[] = [
  { id: "front", title: "חזית", hint: "הסתכלו ישר למצלמה, ביטוי רגוע, שיער מחוץ לפנים.", optional: false },
  { id: "left", title: "חצי פרופיל שמאל", hint: "סובבו את הראש שמאלה בערך 45°.", optional: true },
  { id: "right", title: "חצי פרופיל ימין", hint: "סובבו את הראש ימינה בערך 45°.", optional: true },
];

interface Shot {
  blob: Blob;
  url: string;
  landmarks: P[] | null;
  quality: ScanImageQuality;
  issues: Issue[];
}

export function ScanWizard({ onDone }: { onDone: (scanId: string) => void }) {
  const [i, setI] = useState(0);
  const [shots, setShots] = useState<Partial<Record<ScanStep, Shot>>>({});
  const [camera, setCamera] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addScan = useStore((s) => s.addScan);
  const updateScan = useStore((s) => s.updateScan);
  const step = STEPS[i];
  const shot = shots[step.id];

  useEffect(
    () => () => {
      Object.values(shots).forEach((s) => s && URL.revokeObjectURL(s.url));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function handle(raw: Blob) {
    setCamera(false);
    setChecking(true);
    setError(null);
    try {
      const blob = await prepareImage(raw, 1280, 0.9);
      const q = await measureImageQuality(blob);
      let res = null;
      try {
        res = await detectImage(blob);
      } catch {
        setError("לא הצלחנו לטעון את מודל זיהוי הפנים בדפדפן. נסו לרענן את הדף.");
      }
      const lm = (res?.faceLandmarks[0] as P[] | undefined) ?? null;
      const issues = captureIssues(step.id, poseCheck(lm ?? undefined), { brightness: q.brightness, sharpness: q.sharpness });
      const prev = shots[step.id];
      if (prev) URL.revokeObjectURL(prev.url);
      setShots((s) => ({
        ...s,
        [step.id]: { blob, url: URL.createObjectURL(blob), landmarks: lm, issues, quality: { brightness: Math.round(q.brightness), sharpness: Math.round(q.sharpness), width: q.width, height: q.height, issues } },
      }));
    } catch {
      setError("לא הצלחנו לקרוא את התמונה. נסו JPG או PNG.");
    } finally {
      setChecking(false);
    }
  }

  const blocking = (s?: Shot) => !s || !s.landmarks;

  async function finish() {
    const front = shots.front;
    if (!front?.landmarks) return;
    setSaving("שומרים את הסריקה במכשיר…");
    setError(null);
    try {
      const images: FaceScan["images"] = {};
      const quality: FaceScan["quality"] = {};
      for (const st of STEPS) {
        const s = shots[st.id];
        if (!s) continue;
        images[st.id] = await saveImage(s.blob);
        quality[st.id] = s.quality;
      }
      const obs = frontObservations(front.landmarks);
      const aspect = front.quality.width / front.quality.height;
      const id = uid("scan");
      addScan({ id, date: dateKey(), createdAt: new Date().toISOString(), images, quality, landmarks: packLandmarks(front.landmarks), observations: { ...obs, aspect } });

      const { aiEnabled } = await fetchStatus();
      if (aiEnabled && consent) {
        setSaving("ה-AI כותב את הדוח… (עד דקה)");
        const enc = async (st: ScanStep) => (shots[st] ? { mediaType: "image/jpeg" as const, data: await blobToBase64(shots[st]!.blob) } : undefined);
        const observations = [
          `יחס רוחב לגובה של הפנים בתמונה: ${obs.widthToHeight.toFixed(2)}`,
          `רוחב לסת ביחס לרוחב לחיים: ${obs.jawToCheek.toFixed(2)}`,
          `רוחב מצח ביחס לרוחב לחיים: ${obs.foreheadToCheek.toFixed(2)}`,
          `יחס שליש אמצעי לשליש תחתון: ${obs.midToLower.toFixed(2)}`,
          `סטייה ממוצעת בין צד לצד (מנורמלת לרוחב הפנים): ${obs.asymmetry.toFixed(3)}`,
          `הטיית ראש בתמונה: ${obs.rollDeg.toFixed(1)} מעלות`,
          `הערכת צורת פנים גסה לפי נקודות: ${obs.shapeGuess}`,
        ].join("\n");
        try {
          const res = await postJSON<{ report: FaceScanReport }>("/api/face-scan", {
            profile: profileContext(useStore.getState().profile),
            front: await enc("front"),
            left: await enc("left"),
            right: await enc("right"),
            observations,
          });
          updateScan(id, { report: { source: "ai", date: dateKey(), data: res.report } });
        } catch (e) {
          setError(`הסריקה נשמרה, אבל דוח ה-AI נכשל: ${(e as Error).message}. אפשר לנסות שוב מהדוח.`);
        }
      }
      onDone(id);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <ol className="mb-5 flex items-center gap-2" aria-label="שלבי הסריקה">
          {STEPS.map((s, idx) => (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => setI(idx)}
                className={cn(
                  "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition",
                  idx === i ? "border-accent bg-accent text-white" : shots[s.id]?.landmarks ? "border-accent/30 bg-accent-soft text-accent-strong" : "border-line bg-white text-muted",
                )}
                aria-current={idx === i ? "step" : undefined}
              >
                {shots[s.id]?.landmarks && idx !== i && <Check className="size-3.5" />}
                {s.title}
              </button>
            </li>
          ))}
        </ol>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">
              {step.title} {step.optional && <span className="text-xs font-normal text-dim">(אופציונלי)</span>}
            </div>
            <p className="text-sm text-muted">{step.hint}</p>
          </div>
        </div>

        {camera ? (
          <LiveCapture step={step.id} onCapture={handle} onClose={() => setCamera(false)} />
        ) : shot ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-3xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt={step.title} className="aspect-[3/4] w-full object-cover sm:aspect-[4/3]" />
              <span className="absolute start-3 top-3">
                {shot.issues.length === 0 ? (
                  <Badge tone="green">
                    <Check className="size-3" /> התמונה מתאימה
                  </Badge>
                ) : (
                  <Badge tone="warn">
                    <AlertTriangle className="size-3" /> כדאי לשפר
                  </Badge>
                )}
              </span>
            </div>
            {shot.issues.length > 0 && (
              <ul className="space-y-1 rounded-2xl bg-warn-bg p-3 text-sm text-warn">
                {shot.issues.map((x) => (
                  <li key={x}>• {ISSUE_TEXT[x]}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={() => setCamera(true)}>
                צילום מחדש
              </Button>
              <Button variant="ghost" icon={<ImagePlus className="size-4" />} onClick={() => fileRef.current?.click()}>
                העלאת תמונה אחרת
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-line bg-gradient-to-b from-white to-accent-soft p-6 text-center sm:aspect-[4/3]">
            <div className="grid size-16 place-items-center rounded-2xl bg-white text-accent shadow-card">
              <ScanFace className="size-8" />
            </div>
            <p className="max-w-xs text-sm text-muted">צלמו עם מדריך יישור חי, או העלו תמונה קיימת. הזיהוי רץ בדפדפן שלכם.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<Camera className="size-4" />} onClick={() => setCamera(true)}>
                פתיחת מצלמה
              </Button>
              <Button variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => fileRef.current?.click()}>
                העלאת תמונה
              </Button>
            </div>
          </div>
        )}
        {checking && <p className="mt-3 text-center text-sm text-muted">בודקים תאורה, חדות, מיקום וזווית…</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="העלאת תמונה לסריקה"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) handle(f);
          }}
        />
        {error && (
          <div className="mt-3">
            <ErrorBox message={error} />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" disabled={i === 0} onClick={() => setI((x) => x - 1)}>
            הקודם
          </Button>
          {i < STEPS.length - 1 ? (
            <Button disabled={!step.optional && blocking(shot)} onClick={() => setI((x) => x + 1)}>
              {shot || !step.optional ? "הבא" : "דילוג"}
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="mb-2 font-semibold">מה נבדק בכל תמונה</div>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>• זיהוי פנים ו-478 נקודות ציון (בדפדפן)</li>
            <li>• תאורה, חדות ורזולוציה</li>
            <li>• מרחק מהמצלמה ומיקום במסגרת</li>
            <li>• זווית הראש והטייה</li>
          </ul>
          <p className="mt-3 text-xs text-dim">זו סריקה מתמונה דו-ממדית. אין כאן מדידת עומק כמו בחיישן TrueDepth.</p>
        </Card>
        <Card>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              מאשר/ת שליחת התמונות לניתוח AI בשרת (לדוח המלא). בלי אישור, נשמרות רק התצפיות שחושבו במכשיר.
              <span className="mt-1 flex items-center gap-1 text-xs text-dim">
                <ShieldCheck className="size-3.5 text-green" /> התמונות נשמרות רק במכשיר שלך.
              </span>
            </span>
          </label>
          <Button className="mt-4 w-full" size="lg" disabled={blocking(shots.front) || !!saving} loading={!!saving} onClick={finish}>
            {saving ?? "יצירת הדוח"}
          </Button>
          {blocking(shots.front) && <p className="mt-2 text-center text-xs text-dim">צריך לפחות תמונת חזית שבה זוהו פנים</p>}
        </Card>
      </div>
    </div>
  );
}
