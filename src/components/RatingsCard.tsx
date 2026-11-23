"use client";
import { useMemo, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useStore, dayScore } from "@/lib/store";
import { tasksForDate } from "@/lib/plan";
import { dateKey, lastNDays } from "@/lib/utils";
import { Card, SectionTitle } from "./ui";

interface Tile {
  key: string;
  label: string;
  value: number | null; // 0-100, null = not enough data
  hint: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Habit ratings computed only from what the user actually logged. Never from appearance or body measurements. */
export function useHabitRatings(): Tile[] {
  const s = useStore();
  return useMemo(() => {
    const days14 = lastNDays(14).filter((d) => d <= dateKey());
    const days7 = lastNDays(7);
    const week = days7.map((d) => dayScore(s, d));
    const active = week.filter((w) => w.total > 0 || w.checkin);
    const overall = active.length ? clamp(week.reduce((a, b) => a + b.score, 0) / 7) : null;

    const rate = (cat: string) => {
      let done = 0;
      let total = 0;
      for (const d of days14) {
        const ids = new Set(s.completions[d] ?? []);
        for (const t of tasksForDate(s.plan, d, s.customTasks)) {
          if (t.category !== cat) continue;
          total++;
          if (ids.has(t.id)) done++;
        }
      }
      return total ? clamp((done / total) * 100) : null;
    };

    const sleeps = days14.map((d) => s.checkins[d]?.sleepHours).filter((v): v is number => typeof v === "number");
    const sleep = sleeps.length ? clamp((sleeps.filter((h) => h >= 7).length / sleeps.length) * 100) : null;
    const waters = days14.map((d) => s.checkins[d]?.waterGlasses).filter((v): v is number => typeof v === "number");
    const water = waters.length ? clamp((waters.reduce((a, b) => a + Math.min(b, 8), 0) / (waters.length * 8)) * 100) : null;
    const trainings = s.workouts.filter((w) => days7.includes(w.date)).length;
    const training = s.workouts.length ? clamp((trainings / 3) * 100) : null;

    return [
      { key: "overall", label: "עקביות כללית", value: overall, hint: "ממוצע השלמת הרגלים ב-7 ימים" },
      { key: "skin", label: "שגרת עור", value: rate("skin"), hint: "משימות עור שהושלמו ב-14 ימים" },
      { key: "sleep", label: "שינה", value: sleep, hint: "לילות עם 7+ שעות (לפי Check-in)" },
      { key: "water", label: "שתייה", value: water, hint: "כוסות מים מול יעד 8" },
      { key: "training", label: "אימונים", value: training, hint: "אימונים השבוע מול יעד 3" },
      { key: "posture", label: "יציבה", value: rate("posture"), hint: "משימות יציבה שהושלמו ב-14 ימים" },
    ];
  }, [s]);
}

export function RatingsCard() {
  const tiles = useHabitRatings();
  const name = useStore((s) => s.profile?.name);
  const [shared, setShared] = useState(false);

  async function share() {
    const text = `GLOWUP AI · ההרגלים של ${name ?? ""} השבוע\n` + tiles.map((t) => `${t.label}: ${t.value ?? "—"}`).join("\n");
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* user cancelled or clipboard blocked */
    }
  }

  return (
    <Card>
      <SectionTitle>הדירוגים שלך: הרגלים</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.key} className="rounded-2xl border border-line bg-surface-2/70 p-4" title={t.hint}>
            <div className="text-xs text-muted">{t.label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{t.value ?? "—"}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${t.label}: ${t.value ?? "אין עדיין נתונים"}`}>
              <div className="h-full rounded-full bg-gradient-to-l from-cyan to-accent transition-all" style={{ width: `${t.value ?? 0}%` }} />
            </div>
            <div className="mt-2 text-[11px] leading-snug text-dim">{t.value === null ? "אין עדיין נתונים" : t.hint}</div>
          </div>
        ))}
      </div>
      <button onClick={share} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted hover:text-fg">
        {shared ? <Check className="size-4 text-green" /> : <Share2 className="size-4" />}
        {shared ? "הועתק" : "שתפו עם חברים"}
      </button>
      <p className="mt-1 text-center text-[11px] text-dim">הציונים מחושבים רק ממה שתיעדת באפליקציה. אין בהם דירוג של המראה או הגוף.</p>
    </Card>
  );
}
