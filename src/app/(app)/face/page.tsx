"use client";
import { useState } from "react";
import { ScanFace, Sparkles } from "lucide-react";
import { useAIStatus } from "@/lib/api";
import { useAnalysis } from "@/lib/useAnalysis";
import { useStore } from "@/lib/store";
import { demoFace } from "@/lib/demo";
import { FACE_SHAPE_INFO, type FaceShape } from "@/lib/knowledge";
import type { FaceAnalysis } from "@/lib/schemas";
import { Button, Card, ErrorBox, PageHeader, SectionTitle, Spinner } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";
import { AnalysisHistory, CloseResult, FaceResult } from "@/components/results";
import { cn } from "@/lib/utils";

export default function FacePage() {
  const ai = useAIStatus();
  const { run, loading, error, record, setRecord } = useAnalysis("face");
  const profile = useStore((s) => s.profile);
  const manual = useStore((s) => s.manualFaceShape) as FaceShape | null;
  const setManual = useStore((s) => s.setManualFaceShape);
  const [image, setImage] = useState<Blob | null>(null);
  const [glasses, setGlasses] = useState(false);
  const needsShape = !ai.aiEnabled && !manual;

  function start() {
    run({
      image,
      extra: { wearsGlasses: glasses },
      demo: (q) => demoFace(manual ?? "oval", q, profile, glasses),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניתוח פנים"
        subtitle="המלצות לתסרוקת, גבות, טיפוח, משקפיים וסטייל — בלי ציונים ובלי דירוגים."
        icon={<ScanFace className="size-5" />}
        actions={record && <CloseResult onClick={() => setRecord(null)} />}
      />

      {record ? (
        <FaceResult r={record.result as FaceAnalysis} source={record.source} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <SectionTitle>1. העלאת תמונה</SectionTitle>
            <ImageUploader
              value={image}
              onChange={setImage}
              hint="תמונת פנים ברורה מלפנים"
              tips={["אור יום רך מול הפנים", "מבט ישר למצלמה, בגובה העיניים", "שיער מחוץ לפנים, בלי משקפי שמש", "בלי פילטרים"]}
            />
          </Card>

          <div className="space-y-4 lg:col-span-3">
            {!ai.loading && !ai.aiEnabled && (
              <Card>
                <SectionTitle>2. בחירת צורת פנים (מצב דמו)</SectionTitle>
                <p className="mb-3 text-sm text-muted">
                  במצב דמו אין AI שמנתח את התמונה, לכן בחרו את הצורה הקרובה ביותר לפי התיאור. מסתכלים במראה: מה הרוחב של המצח, הלחיים והלסת, ומה היחס בין אורך לרוחב?
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(FACE_SHAPE_INFO) as FaceShape[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setManual(k)}
                      className={cn(
                        "rounded-xl border p-3 text-right transition",
                        manual === k ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong",
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <FaceShapeIcon shape={k} /> {FACE_SHAPE_INFO[k].label}
                      </div>
                      <div className="mt-1 text-xs text-muted">{FACE_SHAPE_INFO[k].identify}</div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
            <Card>
              <SectionTitle>{ai.aiEnabled ? "2." : "3."} פרטים נוספים</SectionTitle>
              <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
                <input type="checkbox" checked={glasses} onChange={(e) => setGlasses(e.target.checked)} className="size-4" />
                אני מרכיב/ה משקפיים (לקבלת המלצות מסגרות)
              </label>
              {error && (
                <div className="mt-4">
                  <ErrorBox message={error} onRetry={start} />
                </div>
              )}
              {loading ? (
                <Spinner label={ai.aiEnabled ? "ה-AI מנתח את התמונה… (עד כחצי דקה)" : "מכינים המלצות…"} />
              ) : (
                <Button size="lg" className="mt-4 w-full" disabled={!image || needsShape} icon={<Sparkles className="size-4" />} onClick={start}>
                  {ai.aiEnabled ? "נתח עם AI" : "קבל המלצות (דמו)"}
                </Button>
              )}
              {!image && <p className="mt-2 text-center text-xs text-dim">העלו תמונה כדי להמשיך</p>}
              <p className="mt-4 text-xs leading-relaxed text-dim">
                המערכת לא נותנת ציון אטרקטיביות או סימטריה, ולא מנסה לזהות גיל, מוצא, בריאות או אישיות. המטרה: המלצות טיפוח וסטייל מעשיות בלבד.
              </p>
            </Card>
          </div>
        </div>
      )}

      <AnalysisHistory type="face" onOpen={setRecord} />
    </div>
  );
}

function FaceShapeIcon({ shape }: { shape: FaceShape }) {
  const paths: Record<FaceShape, string> = {
    oval: "M12 2c4 0 6 4 6 9s-2.5 11-6 11-6-6-6-11 2-9 6-9z",
    round: "M12 3a8 8 0 100 18 8 8 0 000-18z",
    square: "M5 4h14v12c0 3-3 5-7 5s-7-2-7-5z",
    rectangle: "M6 2h12v15c0 3-3 5-6 5s-6-2-6-5z",
    heart: "M4 4h16c0 6-3 18-8 18S4 10 4 4z",
    diamond: "M12 2l6 9-6 11-6-11z",
    triangle: "M8 3h8l4 15c0 2-4 4-8 4s-8-2-8-4z",
  };
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d={paths[shape]} />
    </svg>
  );
}
