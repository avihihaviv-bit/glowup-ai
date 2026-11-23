"use client";
import { useMemo, useState } from "react";
import { Sunrise, Check, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, dateKey } from "@/lib/utils";
import { Card, PageHeader, ProgressBar, Segmented, SectionTitle } from "@/components/ui";
import { WeatherCard, useWeather } from "@/components/WeatherCard";

interface Step {
  id: string;
  title: string;
  how: string;
  minutes: number;
  priority: number; // lower = more essential
}

export default function MorningPage() {
  const [budget, setBudget] = useState<"5" | "10" | "15">("10");
  const products = useStore((s) => s.products);
  const gender = useStore((s) => s.profile?.gender);
  const { weather } = useWeather();
  const today = dateKey();
  const [done, setDone] = useState<Record<string, boolean>>({});

  const steps = useMemo(() => {
    const has = (c: string) => products.some((p) => p.category === c);
    const sunny = !weather || weather.kind === "hot" || weather.kind === "mild";
    const all: Step[] = [
      { id: "teeth", title: "צחצוח שיניים", how: "שתי דקות עם משחה עם פלואוריד.", minutes: 2, priority: 1 },
      { id: "face", title: "שטיפת פנים", how: has("cleanser") ? "תכשיר הניקוי שלך, מים פושרים." : "מים פושרים, או ניקוי עדין לעור שמנוני.", minutes: 1, priority: 2 },
      { id: "deo", title: "דאודורנט", how: "על עור יבש, לפי הוראות המוצר.", minutes: 1, priority: 2 },
      { id: "moist", title: "לחות", how: "כמות בגודל אפונה.", minutes: 1, priority: 3 },
      { id: "spf", title: "קרם הגנה", how: sunny ? "SPF 30+ לפנים, לצוואר ולאוזניים." : "אם יוצאים לשמש, SPF 30+.", minutes: 1, priority: sunny ? 3 : 6 },
      { id: "hair", title: "שיער", how: "כמות קטנה של מוצר, מאחור לפנים, ובדיקה מהצד.", minutes: 3, priority: 4 },
      { id: "clothes", title: "בדיקת לבוש", how: weather ? `לפי ${weather.temp}° ו${weather.label || "מזג האוויר"}.${weather.kind === "rain" ? " מעיל או מטריה." : ""}` : "לבוש נקי שמתאים ליום.", minutes: 2, priority: 4 },
      { id: "water", title: "כוס מים", how: "כוס מים אחרי הקימה.", minutes: 0, priority: 5 },
      { id: "groom", title: gender === "female" ? "גבות ופרטים קטנים" : "זקן / גילוח קצר", how: gender === "female" ? "מסרק גבות, בדיקת ציפורניים." : "סידור קו הזקן או גילוח קצר, לפי הצורך.", minutes: 3, priority: 6 },
      { id: "plan", title: "תוכנית היום", how: "מבט על משימות היום בדשבורד.", minutes: 1, priority: 7 },
    ];
    const max = Number(budget);
    const out: Step[] = [];
    let used = 0;
    for (const s of [...all].sort((a, b) => a.priority - b.priority)) {
      if (used + s.minutes <= max) {
        out.push(s);
        used += s.minutes;
      }
    }
    return { list: out, used };
  }, [budget, products, weather, gender]);

  const doneCount = steps.list.filter((s) => done[`${today}:${s.id}`]).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Smart Morning Reset" subtitle="בוחרים כמה זמן יש, ומקבלים את השגרה החשובה ביותר שנכנסת בו." icon={<Sunrise className="size-5" />} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Segmented<"5" | "10" | "15">
            value={budget}
            onChange={setBudget}
            options={[
              { value: "5", label: "5 דקות" },
              { value: "10", label: "10 דקות" },
              { value: "15", label: "15 דקות" },
            ]}
          />
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar value={steps.list.length ? (doneCount / steps.list.length) * 100 : 0} />
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {doneCount}/{steps.list.length}
            </span>
          </div>
          <ol className="mt-4 space-y-2">
            {steps.list.map((s, i) => {
              const k = `${today}:${s.id}`;
              const on = !!done[k];
              return (
                <li key={s.id}>
                  <button onClick={() => setDone((d) => ({ ...d, [k]: !d[k] }))} aria-pressed={on} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition", on ? "border-green/40 bg-green-soft" : "border-line bg-white")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold", on ? "bg-green text-white" : "bg-accent-soft text-accent-strong")}>{on ? <Check className="size-4" /> : i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.title}</span>
                      <span className="text-sm text-muted">{s.how}</span>
                    </span>
                    {s.minutes > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-dim">
                        <Clock className="size-3" /> {s.minutes}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-dim">סה״כ כ-{steps.used} דקות. השלבים מסודרים לפי מה שהכי חשוב, ומותאמים למוצרים ששמרת ולמזג האוויר.</p>
        </Card>
        <div className="space-y-5">
          <WeatherCard />
          <Card>
            <SectionTitle>טיפ</SectionTitle>
            <p className="text-sm text-muted">להכין את הבגדים בערב לפני חוסך כמה דקות טובות בבוקר.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
