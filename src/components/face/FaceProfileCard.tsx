"use client";
import { useRef, useState } from "react";
import { Download, Share2, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { useStore, computeStreak, dayScore } from "@/lib/store";
import { FACE_SHAPE_INFO, type FaceShape } from "@/lib/knowledge";
import { matchHairstyles, audienceFor } from "@/lib/demo";
import type { FaceScan } from "@/lib/types";
import type { FaceScanReport } from "@/lib/schemas";
import { heDate, lastNDays } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useImageUrl } from "../StoredImage";
import { Button } from "../ui";

/** A shareable profile summary. No beauty scores, rankings or percentiles. */
export function FaceProfileCard({ scan }: { scan: FaceScan }) {
  const t = useT();
  const s = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const url = useImageUrl(scan.images.front);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const report = scan.report?.data as FaceScanReport | undefined;
  const shape = FACE_SHAPE_INFO[(scan.observations?.shapeGuess ?? "oval") as FaceShape];
  const hair = report?.hairstyleIdeas?.slice(0, 3) ?? matchHairstyles({ faceShape: scan.observations?.shapeGuess, audience: audienceFor(s.profile) }).slice(0, 3).map((h) => h.name);
  const grooming = report?.groomingPriorities?.slice(0, 3) ?? ["שגרת עור בסיסית: ניקוי, לחות, SPF", "גבות מסודרות", "תספורת כל 4-6 שבועות"];
  const week = Math.round(lastNDays(7).reduce((a, d) => a + dayScore(s, d).score, 0) / 7);
  const streak = computeStreak(s).current;
  const hasSkin = s.analyses.some((a) => a.type === "skin") || s.products.length > 0;
  const q = scan.quality.front;

  async function exportPng(share: boolean) {
    if (!ref.current) return;
    setBusy(true);
    setDone(null);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#f5f9ff" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `glowup-profile-${scan.date}.png`, { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "GLOWUP AI" });
        setDone("שותף");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
        setDone("התמונה הורדה");
      }
    } catch {
      setDone("הייצוא לא הצליח בדפדפן הזה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div ref={ref} dir="rtl" className="mx-auto w-[360px] overflow-hidden rounded-[28px] bg-[#f5f9ff] p-5 font-sans text-[#172b4d]">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold tracking-wide" dir="ltr">
              GLOWUP <span className="text-[#2878f0]">AI</span>
            </div>
            <div className="text-[11px] text-[#72829b]">סריקה · {heDate(scan.date)}</div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="size-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-[#dcebff] shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {url && <img src={url} alt="" className="size-full object-cover" />}
            </div>
            <div>
              <div className="text-lg font-extrabold">{s.profile?.name}</div>
              <div className="mt-1 inline-block rounded-full bg-[#dcebff] px-2.5 py-0.5 text-[11px] font-semibold text-[#174ea6]">צורת פנים משוערת: {shape?.label}</div>
              <div className="mt-1 text-[11px] text-[#72829b]">איכות תמונה: {q && q.issues.length === 0 ? "טובה" : "סבירה"}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["עקביות שבועית", `${week}%`],
              ["ימים ברצף", `${streak}`],
              ["שגרת עור", hasSkin ? "פעילה" : "עדיין לא"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-2 shadow-sm">
                <div className="text-base font-extrabold text-[#2878f0]">{v}</div>
                <div className="text-[10px] text-[#72829b]">{k}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="text-[11px] font-bold text-[#174ea6]">תסרוקות להתנסות</div>
            <div className="mt-1 text-[12px] leading-5">{hair.join(" · ")}</div>
          </div>
          <div className="mt-2 rounded-2xl bg-white p-3 shadow-sm">
            <div className="text-[11px] font-bold text-[#174ea6]">טיפוח</div>
            <ul className="mt-1 space-y-0.5 text-[12px] leading-5">
              {grooming.map((g, i) => (
                <li key={i}>• {g}</li>
              ))}
            </ul>
          </div>
          {s.profile?.goals?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.profile.goals.slice(0, 4).map((g) => (
                <span key={g} className="rounded-full bg-[#dcebff] px-2 py-0.5 text-[10px] text-[#174ea6]">
                  {t(`goal.${g}`)}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-[9px] leading-4 text-[#72829b]">ניתוח מתמונה דו-ממדית. ללא דירוג מראה. נוצר ב-GLOWUP AI.</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button loading={busy} icon={<Download className="size-4" />} onClick={() => exportPng(false)}>
          הורדה כתמונה
        </Button>
        <Button variant="secondary" disabled={busy} icon={<Share2 className="size-4" />} onClick={() => exportPng(true)}>
          שיתוף
        </Button>
      </div>
      {done && (
        <p className="flex items-center justify-center gap-1 text-sm text-muted">
          <Check className="size-4 text-green" /> {done}
        </p>
      )}
    </div>
  );
}
