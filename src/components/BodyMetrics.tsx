"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Ruler } from "lucide-react";
import { useStore, type BodyMetric } from "@/lib/store";
import { dateKey, heDate, uid, cn } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, SectionTitle } from "./ui";
import { TrendArea } from "./charts";

type Key = "weightKg" | "bodyFatPct" | "waistCm" | "chestCm" | "armCm" | "thighCm";
const LB = 2.20462;
const IN = 2.54;

/** User-entered body measurements. The app never estimates any of these from photos and sets no weight targets. */
export function BodyMetrics() {
  const profile = useStore((s) => s.profile)!;
  const metrics = useStore((s) => s.bodyMetrics);
  const add = useStore((s) => s.addBodyMetric);
  const remove = useStore((s) => s.removeBodyMetric);
  const imperial = profile.units === "imperial";
  const adult = profile.age >= 18;

  const FIELDS: { key: Key; label: string; unit: string; toMetric: (v: number) => number; fromMetric: (v: number) => number; adultOnly?: boolean }[] = [
    { key: "weightKg", label: "משקל", unit: imperial ? "lb" : "ק״ג", toMetric: (v) => (imperial ? v / LB : v), fromMetric: (v) => (imperial ? v * LB : v) },
    { key: "bodyFatPct", label: "אחוז שומן (מדידה שלך)", unit: "%", toMetric: (v) => v, fromMetric: (v) => v, adultOnly: true },
    { key: "waistCm", label: "היקף מותניים", unit: imperial ? "in" : "ס״מ", toMetric: (v) => (imperial ? v * IN : v), fromMetric: (v) => (imperial ? v / IN : v) },
    { key: "chestCm", label: "היקף חזה", unit: imperial ? "in" : "ס״מ", toMetric: (v) => (imperial ? v * IN : v), fromMetric: (v) => (imperial ? v / IN : v) },
    { key: "armCm", label: "היקף זרוע", unit: imperial ? "in" : "ס״מ", toMetric: (v) => (imperial ? v * IN : v), fromMetric: (v) => (imperial ? v / IN : v) },
    { key: "thighCm", label: "היקף ירך", unit: imperial ? "in" : "ס״מ", toMetric: (v) => (imperial ? v * IN : v), fromMetric: (v) => (imperial ? v / IN : v) },
  ];
  const fields = FIELDS.filter((f) => adult || !f.adultOnly);

  const [date, setDate] = useState(dateKey());
  const [vals, setVals] = useState<Partial<Record<Key, string>>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chartKey, setChartKey] = useState<Key>("weightKg");

  function save() {
    const entry: BodyMetric = { id: uid("bm"), date, note: note.trim() || undefined };
    let any = false;
    for (const f of fields) {
      const raw = vals[f.key]?.replace(",", ".");
      if (!raw) continue;
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n <= 0) return setError(`ערך לא תקין ב"${f.label}"`);
      if (f.key === "bodyFatPct" && n > 70) return setError("אחוז שומן חייב להיות בין 1 ל-70");
      entry[f.key] = Math.round(f.toMetric(n) * 10) / 10;
      any = true;
    }
    if (!any) return setError("הזינו לפחות מדד אחד");
    setError(null);
    add(entry);
    setVals({});
    setNote("");
  }

  const chartField = fields.find((f) => f.key === chartKey) ?? fields[0];
  const series = useMemo(
    () => metrics.filter((m) => typeof m[chartField.key] === "number").map((m) => ({ label: heDate(m.date), value: Math.round(chartField.fromMetric(m[chartField.key] as number) * 10) / 10 })),
    [metrics, chartField],
  );

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Ruler className="size-4 text-accent" /> הוספת מדידה
          </span>
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">
          הזינו מדדים שמדדתם בעצמכם (משקל, משקל מודד הרכב גוף, סרט מדידה). האפליקציה לא מעריכה אף אחד מהם מתמונה, ולא מציבה יעדי משקל.
          {!adult && " מתחת לגיל 18 אחוז שומן לא מוצג, וההתמקדות היא בגדילה בריאה."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="תאריך">
            <Input id="bm-date" type="date" max={dateKey()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {fields.map((f) => (
            <Field key={f.key} label={`${f.label} (${f.unit})`}>
              <Input id={`bm-${f.key}`} inputMode="decimal" value={vals[f.key] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
            </Field>
          ))}
        </div>
        <div className="mt-3">
          <Field label="הערה (אופציונלי)">
            <Input id="bm-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="למשל: בבוקר, לפני ארוחה" />
          </Field>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <Button className="mt-4" icon={<Plus className="size-4" />} onClick={save}>
          שמירת מדידה
        </Button>
      </Card>

      {metrics.length ? (
        <>
          <Card>
            <SectionTitle>מגמה</SectionTitle>
            <div className="mb-3 flex flex-wrap gap-2">
              {fields.map((f) => (
                <button key={f.key} onClick={() => setChartKey(f.key)} aria-pressed={chartKey === f.key} className={cn("min-h-10 rounded-full border px-3 text-sm", chartKey === f.key ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-white text-muted")}>
                  {f.label.replace(" (מדידה שלך)", "")}
                </button>
              ))}
            </div>
            {series.length > 1 ? <TrendArea data={series} unit={` ${chartField.unit}`} /> : <p className="py-6 text-center text-sm text-muted">צריך לפחות שתי מדידות של המדד הזה כדי להציג מגמה.</p>}
            <p className="mt-2 text-xs text-dim">שינויים יומיים קטנים במשקל הם טבעיים (מים, שעה ביום). מגמה של כמה שבועות אומרת יותר.</p>
          </Card>
          <Card>
            <SectionTitle>היסטוריה</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-xs text-dim">
                    <th className="py-2 text-start font-medium">תאריך</th>
                    {fields.map((f) => (
                      <th key={f.key} className="py-2 text-start font-medium">
                        {f.label.replace(" (מדידה שלך)", "")}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...metrics].reverse().map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <td className="py-2">{heDate(m.date)}</td>
                      {fields.map((f) => (
                        <td key={f.key} className="py-2 tabular-nums">
                          {typeof m[f.key] === "number" ? `${Math.round(f.fromMetric(m[f.key] as number) * 10) / 10}` : "—"}
                        </td>
                      ))}
                      <td className="py-2 text-end">
                        <button onClick={() => remove(m.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState icon={<Ruler className="size-5" />} title="עוד אין מדידות" text="המדידה הראשונה תופיע כאן, עם גרף מגמה מהמדידה השנייה." />
      )}
    </div>
  );
}
