"use client";
import { useEffect, useState } from "react";
import { Camera, CheckCircle2, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { measureImageQuality, type ImageQuality } from "@/lib/demo";
import { Card, SectionTitle } from "./ui";
import { ImageUploader } from "./ImageUploader";

type Check = { ok: boolean; label: string; fix: string };

function checks(q: ImageQuality, ref?: { brightness: number; sharpness: number }): Check[] {
  const out: Check[] = [
    { ok: q.brightness >= 70 && q.brightness <= 205, label: q.brightness < 70 ? "התמונה כהה" : q.brightness > 205 ? "התמונה בהירה מדי" : "תאורה תקינה", fix: q.brightness < 70 ? "עמדו מול חלון או מקור אור רך, לא עם האור מאחור." : "התרחקו מאור ישיר או משמש חזקה." },
    { ok: q.contrast >= 30, label: q.contrast < 30 ? "ניגודיות נמוכה" : "ניגודיות טובה", fix: "רקע פשוט בצבע שונה מהשיער והעור, ואור מכיוון אחד." },
    { ok: q.sharpness >= 60, label: q.sharpness < 60 ? "התמונה מטושטשת" : "חדות טובה", fix: "נקו את העדשה, החזיקו יציב או השתמשו בטיימר." },
    { ok: Math.min(q.width, q.height) >= 720, label: Math.min(q.width, q.height) < 720 ? `רזולוציה נמוכה (${q.width}×${q.height})` : "רזולוציה מספיקה", fix: "צלמו במצלמה הראשית ולא צילום מסך." },
  ];
  if (ref) {
    const diff = Math.abs(q.brightness - ref.brightness);
    out.push({ ok: diff <= 35, label: diff <= 35 ? "תאורה דומה לסריקה האחרונה" : "התאורה שונה מהסריקה האחרונה", fix: "לצילומי התקדמות: אותו מקום, אותה שעה ואותו מרחק, כדי שההשוואה תהיה הוגנת." });
  }
  return out;
}

/** Local-only photo quality checks. Nothing is uploaded and nothing about the face is judged. */
export function PhotoQualityCoach() {
  const lastFront = useStore((s) => s.scans.find((x) => x.quality.front)?.quality.front);
  const [img, setImg] = useState<Blob | null>(null);
  const [q, setQ] = useState<{ blob: Blob; q: ImageQuality } | null>(null);

  useEffect(() => {
    if (!img) return;
    let live = true;
    measureImageQuality(img).then((r) => live && setQ({ blob: img, q: r })).catch(() => {});
    return () => {
      live = false;
    };
  }, [img]);

  const result = q && q.blob === img ? checks(q.q, lastFront) : null;

  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2"><Camera className="size-4 text-accent" /> מאמן איכות צילום</span>
      </SectionTitle>
      <p className="mb-3 text-sm text-muted">בדיקה טכנית בלבד (תאורה, חדות, רזולוציה), מחושבת במכשיר. התמונה לא נשלחת לשום מקום ולא נשמרת.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploader value={img} onChange={setImg} hint="תמונה לבדיקה לפני סריקה או ניתוח" aspect="aspect-[4/5]" />
        <div>
          {result ? (
            <ul className="space-y-2">
              {result.map((c) => (
                <li key={c.label} className="rounded-2xl border border-line bg-white p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    {c.ok ? <CheckCircle2 className="size-4 text-green" /> : <AlertTriangle className="size-4 text-warn" />}
                    {c.label}
                  </div>
                  {!c.ok && <p className="mt-1 text-muted">{c.fix}</p>}
                </li>
              ))}
              <li className="text-xs text-dim">{result.every((c) => c.ok) ? "התמונה מוכנה לסריקה." : "כדאי לצלם שוב לפני שליחה לניתוח."}</li>
            </ul>
          ) : (
            <ul className="space-y-1.5 text-sm text-muted">
              <li>• אור יום רך מול הפנים</li>
              <li>• מצלמה בגובה העיניים, במרחק זרוע</li>
              <li>• הבעה ניטרלית, בלי משקפיים או כובע</li>
              <li>• אותו מקום ואותה שעה בכל צילום התקדמות</li>
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
