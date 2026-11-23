"use client";
import { useMemo, useState } from "react";
import { Droplets, Plus, Trash2, AlertTriangle, Snowflake } from "lucide-react";
import { useStore } from "@/lib/store";
import type { DebloatEntry } from "@/lib/types";
import { cn, dateKey, heDate, lastNDays, uid } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Segmented, Textarea } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";

type Area = DebloatEntry["area"];
const AREA_LABEL: Record<Area, string> = { face: "נפיחות פנים זמנית", underEye: "נפיחות מתחת לעיניים", abdomen: "נפיחות בבטן" };

const EDUCATION: Record<Area, { title: string; points: string[]; source: ("mayoBags" | "mayoBagsCauses" | "nhsBloating" | "nhsWater")[] }> = {
  face: {
    title: "נפיחות פנים בבוקר",
    points: [
      "נפיחות קלה בבוקר שכיחה ונוטה לרדת במהלך היום.",
      "שינה מספקת וקבועה, ושתייה רגילה לאורך היום, הם הבסיס.",
      "קומפרס קריר יכול להפחית נפיחות באופן זמני. הוא לא משנה את מבנה הפנים.",
      "תרגילי פנים לא משנים את מבנה העצמות.",
    ],
    source: ["nhsWater"],
  },
  underEye: {
    title: "אזור מתחת לעיניים",
    points: [
      "קומפרס קריר: מטלית נקייה ספוגה במים קרירים, כמה דקות, לחץ עדין, בישיבה.",
      "הגבהת הראש מעט בשינה יכולה לעזור לנוזלים לא להצטבר.",
      "מראה האזור מושפע גם ממבנה, תאורה ועור, ולא רק מהרגלים.",
      "המונח 'Itachi Lines' הוא כינוי מהאינטרנט ולא מונח רפואי.",
    ],
    source: ["mayoBags", "mayoBagsCauses"],
  },
  abdomen: {
    title: "נפיחות בבטן",
    points: [
      "אכילה איטית ופה סגור בזמן לעיסה מפחיתים בליעת אוויר.",
      "משקאות מוגזים, וחלק מהירקות והקטניות, מגבירים גזים אצל חלק מהאנשים.",
      "הליכה קלה אחרי ארוחה יכולה לעזור.",
      "יומן אוכל ותסמינים עוזר לזהות מה משפיע עליך.",
    ],
    source: ["nhsBloating"],
  },
};

export default function DebloatPage() {
  const entries = useStore((s) => s.debloat);
  const add = useStore((s) => s.addDebloat);
  const remove = useStore((s) => s.removeDebloat);
  const checkins = useStore((s) => s.checkins);
  const [area, setArea] = useState<Area>("face");
  const now = new Date();
  const [form, setForm] = useState({ date: dateKey(), time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, severity: 2, foods: "", notes: "", better: "" as "" | DebloatEntry["better"] });

  const list = entries.filter((e) => e.area === area);
  const edu = EDUCATION[area];

  // Simple pattern view: average self-rated severity on low-sleep vs. other days (pattern, not cause)
  const pattern = useMemo(() => {
    const days = lastNDays(28);
    type Row = { d: string; sev: number; sleep?: number; water?: number };
    const withData: Row[] = [];
    for (const d of days) {
      const es = list.filter((e) => e.date === d);
      if (!es.length) continue;
      withData.push({ d, sev: es.reduce((a, e) => a + e.severity, 0) / es.length, sleep: checkins[d]?.sleepHours, water: checkins[d]?.waterGlasses });
    }
    const lowSleep = withData.filter((x) => typeof x.sleep === "number" && x.sleep < 7);
    const okSleep = withData.filter((x) => typeof x.sleep === "number" && x.sleep >= 7);
    const avg = (a: { sev: number }[]) => (a.length ? a.reduce((s, x) => s + x.sev, 0) / a.length : null);
    return { n: withData.length, low: avg(lowSleep), ok: avg(okSleep), nLow: lowSleep.length, nOk: okSleep.length };
  }, [list, checkins]);

  function save() {
    add({ id: uid("db"), area, date: form.date, time: form.time, severity: form.severity, foods: form.foods.trim(), notes: form.notes.trim(), better: form.better || undefined });
    setForm((f) => ({ ...f, foods: "", notes: "", better: "" }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Debloat ונפיחות" subtitle="הבנה, יומן ושגרות עדינות. בלי צמצום שתייה, משלשלים, דטוקס או דיאטות." icon={<Droplets className="size-5" />} />
      <Segmented<Area>
        value={area}
        onChange={setArea}
        options={[
          { value: "face", label: "פנים" },
          { value: "underEye", label: "מתחת לעיניים" },
          { value: "abdomen", label: "בטן" },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>{edu.title}</SectionTitle>
          <ul className="space-y-2 text-sm text-muted">
            {edu.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {p}
              </li>
            ))}
          </ul>
          {area !== "abdomen" && (
            <div className="mt-4 rounded-2xl bg-accent-soft p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-accent-strong">
                <Snowflake className="size-4" /> קומפרס קריר, בצורה בטוחה
              </div>
              <p className="mt-1 text-muted">מטלית נקייה במים קרירים (לא קפואים), כמה דקות. לא להניח קרח ישירות על העור. מפחית נפיחות לזמן קצר בלבד.</p>
            </div>
          )}
          <SourceLinks keys={edu.source} />
        </Card>

        <Card>
          <SectionTitle>תיעוד ביומן</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך">
              <Input id="db-date" type="date" max={dateKey()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="שעה">
              <Input id="db-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3">
            <div className="mb-1.5 text-sm font-medium">עוצמה (דיווח עצמי)</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, severity: n })} aria-pressed={form.severity === n} className={cn("h-11 flex-1 rounded-xl border text-sm", form.severity === n ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-white text-muted")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <Field label="מה אכלתי ושתיתי לפני">
              <Input id="db-foods" value={form.foods} onChange={(e) => setForm({ ...form, foods: e.target.value })} placeholder="למשל: פיצה ומשקה מוגז" maxLength={200} />
            </Field>
            <Field label="איך אני מרגיש/ה">
              <Textarea id="db-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-16!" maxLength={300} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["better", "משתפר"],
                  ["same", "אותו דבר"],
                  ["worse", "מחמיר"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} onClick={() => setForm({ ...form, better: form.better === v ? "" : v })} aria-pressed={form.better === v} className={cn("min-h-10 rounded-full border px-3 text-sm", form.better === v ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-white text-muted")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Button className="mt-4 w-full" icon={<Plus className="size-4" />} onClick={save}>
            שמירה ביומן
          </Button>
        </Card>
      </div>

      <Card>
        <SectionTitle action={<Badge>{pattern.n} ימים מתועדים (28 ימים)</Badge>}>דפוסים שבועיים</SectionTitle>
        {pattern.nLow >= 2 && pattern.nOk >= 2 && pattern.low !== null && pattern.ok !== null ? (
          <p className="text-sm text-muted">
            בימים עם פחות מ-7 שעות שינה, העוצמה הממוצעת שתיעדת הייתה {pattern.low.toFixed(1)}, ובימים עם 7+ שעות {pattern.ok.toFixed(1)}. זה דפוס בנתונים שלך, לא הוכחה לסיבה.
          </p>
        ) : (
          <p className="text-sm text-muted">צריך לפחות שני ימים עם תיעוד ושינה קצרה, ושני ימים עם שינה מספקת (מה-Check-in), כדי להשוות.</p>
        )}
      </Card>

      {list.length ? (
        <Card>
          <SectionTitle>היומן: {AREA_LABEL[area]}</SectionTitle>
          <ul className="divide-y divide-line">
            {list.slice(0, 30).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    {heDate(e.date)} · {e.time} · עוצמה {e.severity}/5 {e.better && <Badge>{{ better: "משתפר", same: "אותו דבר", worse: "מחמיר" }[e.better]}</Badge>}
                  </div>
                  {e.foods && <div className="text-muted">אוכל: {e.foods}</div>}
                  {e.notes && <div className="text-muted">{e.notes}</div>}
                </div>
                <button onClick={() => remove(e.id)} className="grid size-9 shrink-0 place-items-center text-dim hover:text-danger" aria-label="מחיקה">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon={<Droplets className="size-5" />} title="היומן ריק" text="תיעוד קצר בכל פעם שמרגישים נפיחות יעזור לראות דפוסים." />
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn-bg p-4 text-sm text-warn">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <span>נפיחות פתאומית, כואבת, חמורה או מתמשכת, נפיחות עם קוצר נשימה, או נפיחות בבטן שלא חולפת, מצדיקות פנייה לרופא/ה. אל תצמצמו שתייה ואל תשתמשו במשלשלים, &quot;דטוקס&quot; או דיאטות הגבלה כדי להפחית נפיחות.</span>
      </div>
    </div>
  );
}
