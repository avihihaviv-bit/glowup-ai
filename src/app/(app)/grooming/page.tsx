"use client";
import { useMemo } from "react";
import { Scissors, Check, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, daysBetween, dateKey, heDate, cn } from "@/lib/utils";
import { Badge, Button, Card, PageHeader, ProgressBar, SectionTitle } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";

interface GroomTask {
  id: string;
  title: string;
  how: string;
  everyDays: number;
  minutes: number;
  forBeard?: boolean;
}

const TASKS: GroomTask[] = [
  { id: "nails-hands", title: "ציפורני ידיים", how: "גזירה ישרה ושיוף קצוות. ניקוי מתחת לציפורן.", everyDays: 7, minutes: 5 },
  { id: "nails-feet", title: "ציפורני רגליים", how: "גזירה ישרה, לא עמוק מדי בצדדים.", everyDays: 14, minutes: 5 },
  { id: "brows", title: "סידור גבות", how: "שערות בודדות מתחת לקשת ובין הגבות בלבד. מסרק גבות לסיום.", everyDays: 14, minutes: 5 },
  { id: "nose-ear", title: "שערות אף ואוזניים", how: "קיצוץ עם מכשיר ייעודי. לא למרוט.", everyDays: 14, minutes: 3 },
  { id: "neckline", title: "קו צוואר ועורף", how: "ניקוי השערות מתחת לקו הלסת ובעורף בין תספורות.", everyDays: 7, minutes: 5 },
  { id: "beard-trim", title: "קיצוץ זקן", how: "קיצוץ אחיד, קו לחי וקו צוואר נקיים. מסרקים לכיוון הצמיחה.", everyDays: 4, minutes: 10, forBeard: true },
  { id: "razor", title: "החלפת סכין / ראש גילוח", how: "סכין קהה מגבירה גירוי. מחליפים לפי השימוש.", everyDays: 10, minutes: 1 },
  { id: "haircut", title: "תספורת", how: "בשיער קצר כל 3-5 שבועות. תדרוך לספר בעמוד השיער.", everyDays: 28, minutes: 45 },
  { id: "brush-clean", title: "ניקוי מסרק ומברשת", how: "הוצאת שערות ושטיפה במים וסבון.", everyDays: 14, minutes: 5 },
  { id: "pillowcase", title: "החלפת ציפית", how: "ציפית נקייה, במיוחד אם העור נוטה לפצעונים.", everyDays: 7, minutes: 2 },
  { id: "towel", title: "החלפת מגבת פנים", how: "מגבת אישית ונקייה, בלי לשתף.", everyDays: 4, minutes: 1 },
  { id: "shoes", title: "ניקוי נעליים", how: "ניגוב סוליה וצדדים, אוורור.", everyDays: 7, minutes: 5 },
];

export default function GroomingPage() {
  const log = useStore((s) => s.groomingLog);
  const mark = useStore((s) => s.markGroomed);
  const gender = useStore((s) => s.profile?.gender);
  const today = dateKey();

  const rows = useMemo(
    () =>
      TASKS.filter((t) => !t.forBeard || gender !== "female").map((t) => {
        const last = log[t.id];
        const since = last ? daysBetween(last, today) : null;
        const due = since === null ? true : since >= t.everyDays;
        const progress = since === null ? 0 : Math.max(0, 100 - (since / t.everyDays) * 100);
        return { ...t, last, since, due, progress };
      }),
    [log, today, gender],
  );
  const dueNow = rows.filter((r) => r.due);
  const dentist = useStore((s) => s.dentist);
  const outings = useStore((s) => s.outings);
  const calendar = useMemo(() => {
    const ev: { date: string; title: string }[] = [];
    const end = addDays(today, 30);
    for (const r of rows) {
      let d = r.last ? addDays(r.last, r.everyDays) : today;
      if (d < today) d = today;
      while (d <= end) {
        ev.push({ date: d, title: r.title });
        d = addDays(d, r.everyDays);
      }
    }
    if (dentist.lastVisit) {
      const next = addDays(dentist.lastVisit, Math.round(dentist.intervalMonths * 30.4));
      if (next <= end) ev.push({ date: next < today ? today : next, title: "ביקור אצל רופא שיניים" });
    }
    for (const o of outings) {
      const d = o.start.slice(0, 10);
      if (d >= today && d <= end) ev.push({ date: d, title: `אירוע: ${o.title}` });
    }
    const by = new Map<string, string[]>();
    for (const e of ev.sort((a, b) => a.date.localeCompare(b.date))) by.set(e.date, [...(by.get(e.date) ?? []), e.title]);
    return [...by.entries()].slice(0, 14);
  }, [rows, today, dentist, outings]);

  return (
    <div className="space-y-6">
      <PageHeader title="טיפוח ופרטים קטנים" subtitle="מה מגיע מתי, בלי לזכור בעל פה." icon={<Scissors className="size-5" />} />

      <Card className="bg-gradient-to-br from-white to-accent-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted">מה מגיע עכשיו</div>
            <div className="text-2xl font-extrabold">{dueNow.length ? `${dueNow.length} פריטים` : "הכל מעודכן"}</div>
          </div>
          <Badge tone={dueNow.length ? "accent" : "green"}>{rows.length - dueNow.length}/{rows.length} מעודכנים</Badge>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id} className={cn("p-4", r.due && "border-accent/40")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.title}</span>
                  {r.due ? <Badge tone="accent">מגיע עכשיו</Badge> : <Badge>בעוד {r.everyDays - (r.since ?? 0)} ימים</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">{r.how}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-dim">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {r.minutes} דק׳
                  </span>
                  <span>כל {r.everyDays} ימים</span>
                  <span>{r.last ? `לאחרונה: ${heDate(r.last)}` : "עוד לא תועד"}</span>
                </div>
              </div>
              <Button size="sm" variant={r.last === today ? "green" : "secondary"} icon={<Check className="size-4" />} onClick={() => mark(r.id)} disabled={r.last === today}>
                {r.last === today ? "בוצע" : "ביצעתי"}
              </Button>
            </div>
            <ProgressBar value={r.progress} className="mt-3 h-1.5" />
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle>לוח טיפוח ל-30 הימים הקרובים</SectionTitle>
        {calendar.length ? (
          <ul className="divide-y divide-line">
            {calendar.map(([d, titles]) => (
              <li key={d} className="flex gap-4 py-2.5 text-sm">
                <span className={cn("w-20 shrink-0 font-semibold", d === today ? "text-accent" : "text-fg")}>{d === today ? "היום" : heDate(d)}</span>
                <span className="text-muted">{titles.join(" · ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">אין פריטים מתוכננים.</p>
        )}
      </Card>

      <Card>
        <SectionTitle>גילוח בלי גירוי</SectionTitle>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>• לרכך את השיער לפני: בסוף מקלחת או עם מגבת חמימה ולחה.</li>
          <li>• קרם גילוח לחלחל, גילוח בכיוון הצמיחה, בלי למתוח את העור חזק.</li>
          <li>• לא לעבור על אותו אזור יותר מפעמיים, ולשטוף את הסכין בין משיכות.</li>
          <li>• אם יש פצעוני גילוח חוזרים, מכונת קיצוץ או סכין עם פחות להבים עשויות להתאים יותר.</li>
          <li>• לא למרוט שערה שנתקעה. בעיה מתמשכת: רופא/ת עור.</li>
        </ul>
        <SourceLinks topic="grooming" />
      </Card>
    </div>
  );
}
