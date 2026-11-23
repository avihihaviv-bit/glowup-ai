"use client";
import { useMemo, useState } from "react";
import { useStore, dayScore } from "@/lib/store";
import { tasksForDate } from "@/lib/plan";
import { addDays, cn, dateKey, heDate, parseKey } from "@/lib/utils";
import { Card, SectionTitle } from "./ui";

type Metric = "all" | "skin" | "oral" | "sleep" | "tips";
const LABEL: Record<Metric, string> = { all: "כל ההרגלים", skin: "שגרת עור", oral: "טיפוח הפה", sleep: "שינה 7+ שעות", tips: "טיפים שבוצעו" };

/** 12-week consistency heatmap from logged data only. Value is 0..1 per day, null when nothing was planned or logged. */
export function HabitHeatmap() {
  const s = useStore();
  const [metric, setMetric] = useState<Metric>("all");
  const today = dateKey();
  const weeks = 12;

  const tipsByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const dates of Object.values(s.tipDone)) for (const d of dates) m[d] = (m[d] ?? 0) + 1;
    return m;
  }, [s.tipDone]);

  const value = (d: string): number | null => {
    switch (metric) {
      case "all": {
        const sc = dayScore(s, d);
        return sc.total || sc.checkin ? sc.score / 100 : null;
      }
      case "skin": {
        const ts = tasksForDate(s.plan, d, s.customTasks).filter((t) => t.category === "skin");
        if (!ts.length) return null;
        const done = new Set(s.completions[d] ?? []);
        return ts.filter((t) => done.has(t.id)).length / ts.length;
      }
      case "oral": {
        const o = s.oral[d];
        if (!o) return 0;
        return [o.am, o.pm, o.floss, o.tongue].filter(Boolean).length / 4;
      }
      case "sleep": {
        const h = s.checkins[d]?.sleepHours;
        return typeof h === "number" ? (h >= 7 ? 1 : 0.25) : null;
      }
      case "tips":
        return tipsByDate[d] ? Math.min(1, tipsByDate[d] / 3) : 0;
    }
  };

  // grid columns = weeks (oldest -> newest), rows = days (Sun..Sat)
  const start = addDays(today, -parseKey(today).getDay() - (weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
  const active = cols.flat().filter((d) => d <= today && (value(d) ?? 0) > 0).length;

  return (
    <Card>
      <SectionTitle action={<span className="text-xs text-muted">{active} ימים פעילים ב-12 שבועות</span>}>מפת הרגלים</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(LABEL) as Metric[]).map((m) => (
          <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m} className={cn("min-h-9 rounded-full border px-3 text-xs", metric === m ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-white text-muted")}>
            {LABEL[m]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="flex w-max gap-1" dir="ltr">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((d) => {
                const future = d > today;
                const v = future ? null : value(d);
                return (
                  <span
                    key={d}
                    title={`${heDate(d)}: ${v === null ? "אין נתונים" : `${Math.round(v * 100)}%`}`}
                    className={cn("size-4 rounded-[4px] sm:size-5", future && "opacity-0")}
                    style={{ background: v === null ? "var(--surface-2)" : `color-mix(in srgb, var(--accent) ${Math.round(15 + v * 85)}%, var(--surface-3))` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-dim" dir="ltr">
        <span>פחות</span>
        {[0, 0.33, 0.66, 1].map((v) => (
          <span key={v} className="size-3 rounded-[3px]" style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(15 + v * 85)}%, var(--surface-3))` }} />
        ))}
        <span>יותר</span>
      </div>
    </Card>
  );
}
