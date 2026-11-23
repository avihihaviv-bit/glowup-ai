"use client";
import { useMemo, useRef, useState } from "react";
import { Download, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { useStore, dayScore } from "@/lib/store";
import { addDays, dateKey, heDate, lastNDays } from "@/lib/utils";
import { Button, Card, SectionTitle } from "./ui";

function weekStats(s: ReturnType<typeof useStore.getState>, end: string) {
  const days = lastNDays(7, end);
  const tasks = days.reduce((a, d) => a + (s.completions[d]?.length ?? 0), 0);
  const checkins = days.filter((d) => s.checkins[d]).length;
  const sleeps = days.map((d) => s.checkins[d]?.sleepHours).filter((v): v is number => typeof v === "number");
  const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  const workouts = s.workouts.filter((w) => days.includes(w.date)).length;
  const oralFull = days.filter((d) => s.oral[d]?.am && s.oral[d]?.pm).length;
  const tips = Object.values(s.tipDone).reduce((a, ds) => a + ds.filter((d) => days.includes(d)).length, 0);
  const avgScore = Math.round(days.reduce((a, d) => a + dayScore(s, d).score, 0) / 7);
  const scans = s.scans.filter((x) => days.includes(x.date)).length;
  return { days, tasks, checkins, avgSleep, workouts, oralFull, tips, avgScore, scans };
}

/** Weekly Glow-Up Report: counts of what the user actually did. No inferred "improvements". */
export function WeeklyReport() {
  const s = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const today = dateKey();
  const cur = useMemo(() => weekStats(s, today), [s, today]);
  const prev = useMemo(() => weekStats(s, addDays(today, -7)), [s, today]);
  const delta = (a: number, b: number) => (a === b ? "כמו בשבוע הקודם" : a > b ? `+${a - b} משבוע שעבר` : `${a - b} משבוע שעבר`);

  const rows: [string, string, string][] = [
    ["משימות שהושלמו", String(cur.tasks), delta(cur.tasks, prev.tasks)],
    ["ממוצע השלמת הרגלים", `${cur.avgScore}%`, delta(cur.avgScore, prev.avgScore).replace(/(\d+)/, "$1%")],
    ["Check-ins", `${cur.checkins}/7`, delta(cur.checkins, prev.checkins)],
    ["ממוצע שינה", cur.avgSleep !== null ? `${cur.avgSleep.toFixed(1)} ש׳` : "—", cur.avgSleep !== null && prev.avgSleep !== null ? `לעומת ${prev.avgSleep.toFixed(1)} ש׳` : ""],
    ["אימונים", String(cur.workouts), delta(cur.workouts, prev.workouts)],
    ["ימים עם צחצוח בוקר וערב", `${cur.oralFull}/7`, delta(cur.oralFull, prev.oralFull)],
    ["טיפים שבוצעו", String(cur.tips), delta(cur.tips, prev.tips)],
    ["סריקות", String(cur.scans), ""],
  ];

  async function exportPng() {
    if (!ref.current) return;
    try {
      const url = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#f5f9ff" });
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `glowup-week-${today}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
      }
      setMsg("הדוח מוכן");
    } catch {
      setMsg("הייצוא לא הצליח בדפדפן הזה");
    }
  }

  return (
    <Card>
      <SectionTitle action={<Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={exportPng}>שמירה כתמונה</Button>}>דוח Glow-Up שבועי</SectionTitle>
      <div className="overflow-x-auto">
        <div ref={ref} dir="rtl" className="min-w-[320px] rounded-[22px] bg-[#f5f9ff] p-4 text-[#172b4d]">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-extrabold" dir="ltr">GLOWUP <span className="text-[#2878f0]">AI</span></div>
            <div className="text-[11px] text-[#72829b]">{heDate(cur.days[0])} - {heDate(cur.days[6])}</div>
          </div>
          <div className="mt-2 text-lg font-extrabold">{s.profile?.name}, השבוע שלך</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {rows.map(([k, v, d]) => (
              <div key={k} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-[11px] text-[#72829b]">{k}</div>
                <div className="text-xl font-extrabold text-[#2878f0]">{v}</div>
                {d && <div className="text-[10px] text-[#72829b]">{d}</div>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[#72829b]">מבוסס רק על מה שתועד באפליקציה.</p>
        </div>
      </div>
      {msg && <p className="mt-2 flex items-center gap-1 text-sm text-muted"><Check className="size-4 text-green" /> {msg}</p>}
    </Card>
  );
}
