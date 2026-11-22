"use client";
import { useMemo, useState } from "react";
import { Dumbbell, Plus, Trash2, Moon, Apple, PersonStanding, Shirt, ClipboardCheck, HeartPulse } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Exercise, Workout } from "@/lib/types";
import { dateKey, heDate, heDayShort, lastNDays, uid, cn } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, SectionTitle, Segmented, Select, Stat, Textarea } from "@/components/ui";
import { TrendArea, WeeklyBars } from "@/components/charts";
import { CheckinModal } from "@/components/CheckinModal";
import { ImageUploader } from "@/components/ImageUploader";
import { PhotoRatings } from "@/components/PhotoRatings";
import { BodyMetrics } from "@/components/BodyMetrics";

type Tab = "workouts" | "metrics" | "bodyRatings" | "plan" | "strength" | "posture" | "sleep" | "nutrition" | "clothes";

const TYPE_LABEL: Record<Workout["type"], string> = { strength: "כוח", cardio: "אירובי", mobility: "גמישות", posture: "יציבה", sport: "ספורט" };

export default function FitnessPage() {
  const [tab, setTab] = useState<Tab>("workouts");
  return (
    <div className="space-y-6">
      <PageHeader title="גוף וכושר" subtitle="כוח, יציבה, שינה ותזונה בריאה — בריאות וביטחון לפני מראה." icon={<Dumbbell className="size-5" />} />
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="w-max">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "workouts", label: "אימונים" },
              { value: "metrics", label: "המדדים שלי" },
              { value: "bodyRatings", label: "דירוג גוף" },
              { value: "plan", label: "תוכנית" },
              { value: "strength", label: "כוח" },
              { value: "posture", label: "יציבה" },
              { value: "sleep", label: "שינה" },
              { value: "nutrition", label: "תזונה" },
              { value: "clothes", label: "בגדים" },
            ]}
          />
        </div>
      </div>
      {tab === "workouts" && <Workouts />}
      {tab === "metrics" && <BodyMetrics />}
      {tab === "bodyRatings" && <BodyRatings />}
      {tab === "plan" && <WorkoutPlan />}
      {tab === "strength" && <Strength />}
      {tab === "posture" && <Posture />}
      {tab === "sleep" && <Sleep />}
      {tab === "nutrition" && <Nutrition />}
      {tab === "clothes" && <Clothes />}
      <p className="text-xs text-dim">
        GLOWUP AI לא מעריך אחוזי שומן או משקל מתמונות, לא מדרג את הגוף ולא ממליץ על דיאטות קיצוניות. במקרה של כאב, פציעה או מצב רפואי — התייעצו עם רופא/ה או פיזיותרפיסט/ית.
      </p>
    </div>
  );
}

function Workouts() {
  const workouts = useStore((s) => s.workouts);
  const remove = useStore((s) => s.removeWorkout);
  const [open, setOpen] = useState(false);
  const week = lastNDays(7);
  const thisWeek = workouts.filter((w) => week.includes(w.date));
  const minutes = thisWeek.reduce((a, w) => a + w.durationMin, 0);
  const chart = lastNDays(14).map((d) => ({ label: heDayShort(d), value: workouts.filter((w) => w.date === d).reduce((a, w) => a + w.durationMin, 0) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="אימונים השבוע" value={thisWeek.length} icon={<Dumbbell className="size-4" />} />
        <Stat label="דקות השבוע" value={minutes} sub="המלצה כללית: 150+ דק׳ פעילות" icon={<HeartPulse className="size-4" />} accent="green" />
        <Stat label="סה״כ אימונים" value={workouts.length} />
        <Stat label="אימוני כוח השבוע" value={thisWeek.filter((w) => w.type === "strength").length} sub="יעד: 2-3" accent="green" />
      </div>
      <Card>
        <SectionTitle action={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>תיעוד אימון</Button>}>
          דקות אימון — 14 ימים
        </SectionTitle>
        <WeeklyBars data={chart} unit=" דק׳" />
      </Card>
      {workouts.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {workouts.slice(0, 30).map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">{TYPE_LABEL[w.type]}</Badge>
                    <span className="text-sm text-muted">
                      {heDate(w.date)} · {w.durationMin} דק׳
                    </span>
                  </div>
                  {w.exercises.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-sm">
                      {w.exercises.map((e, i) => (
                        <li key={i} className="text-muted">
                          {e.name}: {e.sets}×{e.reps}
                          {e.weight > 0 && ` · ${e.weight} ק״ג`}
                        </li>
                      ))}
                    </ul>
                  )}
                  {w.notes && <p className="mt-2 text-xs text-dim">{w.notes}</p>}
                </div>
                <button onClick={() => remove(w.id)} className="text-dim hover:text-danger" aria-label="מחיקה">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Dumbbell className="size-5" />} title="עוד אין אימונים" text="תעדו את האימון הראשון — גם 15 דקות הליכה נחשבות." action={<Button onClick={() => setOpen(true)}>תיעוד אימון</Button>} />
      )}
      <WorkoutModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function WorkoutModal({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: Partial<Workout> }) {
  return (
    <Modal open={open} onClose={onClose} title="תיעוד אימון" wide>
      {open && <WorkoutForm onDone={onClose} preset={preset} />}
    </Modal>
  );
}

function WorkoutForm({ onDone, preset }: { onDone: () => void; preset?: Partial<Workout> }) {
  const add = useStore((s) => s.addWorkout);
  const [w, setW] = useState<Workout>({
    id: uid("w"),
    date: dateKey(),
    type: "strength",
    durationMin: 30,
    exercises: [],
    notes: "",
    ...preset,
  });
  const setEx = (i: number, e: Partial<Exercise>) => setW((x) => ({ ...x, exercises: x.exercises.map((ex, j) => (j === i ? { ...ex, ...e } : ex)) }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="סוג">
          <Select value={w.type} onChange={(e) => setW({ ...w, type: e.target.value as Workout["type"] })}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="דקות">
          <Input type="number" min={1} max={300} value={w.durationMin} onChange={(e) => setW({ ...w, durationMin: Number(e.target.value) })} />
        </Field>
        <Field label="תאריך">
          <Input type="date" max={dateKey()} value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} />
        </Field>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium">תרגילים (למעקב כוח)</div>
        <div className="space-y-2">
          {w.exercises.map((e, i) => (
            <div key={i} className="grid grid-cols-[1fr_repeat(3,64px)_32px] items-center gap-2">
              <Input placeholder="תרגיל" value={e.name} onChange={(ev) => setEx(i, { name: ev.target.value })} list="exercise-names" />
              <Input type="number" min={0} aria-label="סטים" value={e.sets} onChange={(ev) => setEx(i, { sets: Number(ev.target.value) })} />
              <Input type="number" min={0} aria-label="חזרות" value={e.reps} onChange={(ev) => setEx(i, { reps: Number(ev.target.value) })} />
              <Input type="number" min={0} step={0.5} aria-label="משקל" value={e.weight} onChange={(ev) => setEx(i, { weight: Number(ev.target.value) })} />
              <button onClick={() => setW({ ...w, exercises: w.exercises.filter((_, j) => j !== i) })} className="text-dim hover:text-danger" aria-label="הסרה">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {w.exercises.length > 0 && <div className="grid grid-cols-[1fr_repeat(3,64px)_32px] gap-2 text-center text-[11px] text-dim"><span /> <span>סטים</span><span>חזרות</span><span>ק״ג</span><span /></div>}
          <datalist id="exercise-names">
            {["סקוואט", "שכיבות סמיכה", "חתירה", "פלאנק", "לאנג׳ים", "מתח", "לחיצת חזה", "דדליפט", "לחיצת כתפיים", "Wall angels", "Chin tucks", "גשר ישבן"].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setW({ ...w, exercises: [...w.exercises, { name: "", sets: 3, reps: 10, weight: 0 }] })}>
            הוספת תרגיל
          </Button>
        </div>
      </div>
      <Field label="הערות">
        <Textarea value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} placeholder="איך הרגשת? מה היה קל/קשה?" maxLength={300} />
      </Field>
      <Button
        className="w-full"
        size="lg"
        onClick={() => {
          add({ ...w, exercises: w.exercises.filter((e) => e.name.trim()) });
          onDone();
        }}
      >
        שמירת אימון (+25 XP)
      </Button>
    </div>
  );
}

const PLANS = {
  beginner: [
    { day: "א׳ — כוח גוף מלא", items: ["סקוואט לכיסא 3×10", "שכיבות סמיכה על קיר/ברכיים 3×8", "חתירה עם גומייה/תיק 3×10", "גשר ישבן 3×12", "פלאנק 3×20 שנ׳"] },
    { day: "ג׳ — הליכה + יציבה", items: ["הליכה מהירה 25 דק׳", "Wall angels 2×10", "Chin tucks 2×10", "מתיחת חזה 2×30 שנ׳"] },
    { day: "ה׳ — כוח גוף מלא", items: ["לאנג׳ים לאחור 3×8 לכל רגל", "שכיבות סמיכה 3×מקסימום טכני", "חתירה 3×12", "Dead bug 3×8", "סופרמן 3×10"] },
    { day: "ש׳ — פעילות חופשית", items: ["30-45 דק׳ פעילות שאוהבים: אופניים, שחייה, ריקוד, משחק כדור"] },
  ],
  intermediate: [
    { day: "א׳ — פלג עליון", items: ["לחיצת חזה/שכיבות סמיכה 4×8-10", "חתירה 4×10", "לחיצת כתפיים 3×10", "מתח (בעזרת גומייה) 3×מקס׳", "Face pulls 3×15"] },
    { day: "ב׳ — פלג תחתון", items: ["סקוואט 4×8", "דדליפט רומני 3×10", "לאנג׳ים 3×10", "הרמות עקבים 3×15", "פלאנק צד 3×30 שנ׳"] },
    { day: "ד׳ — אירובי + יציבה", items: ["30 דק׳ אירובי בינוני", "שגרת יציבה 10 דק׳"] },
    { day: "ה׳ — גוף מלא", items: ["סקוואט גביע 3×12", "שכיבות סמיכה 3×מקס׳", "חתירה ביד אחת 3×10", "גשר ישבן 3×12", "Farmer carry 3×30 מ׳"] },
  ],
  advanced: [
    { day: "א׳ — דחיפה", items: ["לחיצת חזה 5×5", "לחיצת כתפיים 4×6-8", "מקבילים 3×8-10", "הרחקות צד 3×15"] },
    { day: "ב׳ — משיכה", items: ["דדליפט 5×3-5", "מתח 4×6-8", "חתירה 4×8", "Face pulls 3×15"] },
    { day: "ד׳ — רגליים", items: ["סקוואט 5×5", "דדליפט רומני 4×8", "בולגרי 3×8", "הרמות עקבים 4×12"] },
    { day: "ו׳ — אירובי + ניידות", items: ["אינטרוולים 20 דק׳", "ניידות ירכיים וכתפיים 15 דק׳"] },
  ],
};

function WorkoutPlan() {
  const profile = useStore((s) => s.profile)!;
  const [level, setLevel] = useState<keyof typeof PLANS>(profile.fitnessLevel);
  const [log, setLog] = useState<Partial<Workout> | null>(null);
  const minor = profile.age < 18;
  return (
    <div className="space-y-4">
      <Segmented<keyof typeof PLANS>
        value={level}
        onChange={setLevel}
        options={[
          { value: "beginner", label: "מתחילים" },
          { value: "intermediate", label: "בינוני" },
          { value: "advanced", label: "מתקדמים" },
        ]}
      />
      {minor && (
        <div className="rounded-xl border border-green/30 bg-green-soft p-3 text-sm text-green">
          מותאם לגיל {profile.age}: דגש על טכניקה, משקל גוף ומגוון פעילויות. לא מומלץ להרים משקלים כבדים ללא הדרכה מקצועית. שינה ותזונה מגוונת חשובות במיוחד בגיל ההתבגרות.
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {PLANS[minor && level === "advanced" ? "intermediate" : level].map((d) => (
          <Card key={d.day}>
            <SectionTitle
              action={
                <Button size="sm" variant="secondary" onClick={() => setLog({ type: d.day.includes("אירובי") || d.day.includes("הליכה") ? "cardio" : "strength", notes: d.day })}>
                  ביצעתי
                </Button>
              }
            >
              {d.day}
            </SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted">
              {d.items.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card className="text-sm text-muted">
        <b className="text-fg">עקרונות:</b> חימום 5 דק׳ לפני כל אימון · טכניקה לפני משקל · להוסיף חזרה/משקל רק כשהסט האחרון מרגיש בשליטה · יום מנוחה בין אימוני כוח לאותה קבוצת שרירים · כאב חד = עוצרים.
      </Card>
      <WorkoutModal open={!!log} onClose={() => setLog(null)} preset={log ?? undefined} />
    </div>
  );
}

function Strength() {
  const workouts = useStore((s) => s.workouts);
  const names = useMemo(() => {
    const m = new Map<string, number>();
    workouts.forEach((w) => w.exercises.forEach((e) => m.set(e.name, (m.get(e.name) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [workouts]);
  const [sel, setSel] = useState<string | null>(null);
  const ex = sel ?? names[0];
  const series = useMemo(() => {
    if (!ex) return [];
    return [...workouts]
      .filter((w) => w.exercises.some((e) => e.name === ex))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((w) => {
        const sets = w.exercises.filter((e) => e.name === ex);
        const best = Math.max(...sets.map((e) => (e.weight > 0 ? e.weight : e.reps)));
        return { label: heDate(w.date), value: best };
      });
  }, [workouts, ex]);
  const usesWeight = workouts.some((w) => w.exercises.some((e) => e.name === ex && e.weight > 0));

  if (!names.length)
    return <EmptyState icon={<Dumbbell className="size-5" />} title="אין עדיין נתוני כוח" text="תעדו אימון עם תרגילים (סטים, חזרות ומשקל) כדי לראות גרף התקדמות." />;

  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {names.map((n) => (
          <button key={n} onClick={() => setSel(n)} className={cn("rounded-full border px-3 py-1.5 text-sm", n === ex ? "border-accent bg-accent-soft text-accent" : "border-line text-muted")}>
            {n}
          </button>
        ))}
      </div>
      <Card>
        <SectionTitle action={series.length > 1 && <Badge tone={last >= first ? "green" : "default"}>{last >= first ? "+" : ""}{(last - first).toFixed(usesWeight ? 1 : 0)} {usesWeight ? "ק״ג" : "חזרות"}</Badge>}>
          {ex} — {usesWeight ? "משקל מקסימלי" : "חזרות מקסימליות"}
        </SectionTitle>
        <TrendArea data={series} unit={usesWeight ? " ק״ג" : ""} color="var(--green)" />
      </Card>
    </div>
  );
}

function Posture() {
  const checkins = useStore((s) => s.checkins);
  const workouts = useStore((s) => s.workouts);
  const [log, setLog] = useState(false);
  const [checkin, setCheckin] = useState(false);
  const data = lastNDays(14).map((d) => ({ label: heDayShort(d), value: checkins[d]?.posture ?? null }));
  const postureSessions = workouts.filter((w) => w.type === "posture" && lastNDays(7).includes(w.date)).length;
  const routine = [
    { name: "Chin tucks", how: "גב לקיר, להכניס סנטר פנימה (סנטר כפול), 5 שנ׳ החזקה", reps: "10 חזרות" },
    { name: "Wall angels", how: "גב, ראש וידיים צמודים לקיר, להחליק ידיים למעלה ולמטה", reps: "10 חזרות" },
    { name: "מתיחת חזה בפתח דלת", how: "אמות על המשקוף, צעד קטן קדימה עד מתיחה עדינה", reps: "2×30 שנ׳" },
    { name: "Band pull-aparts / סופרמן", how: "למשוך גומייה לצדדים או שכיבה על הבטן והרמת ידיים", reps: "2×12" },
    { name: "Cat-Cow", how: "על שש, לעגל ולקשת את הגב לאט עם הנשימה", reps: "10 חזרות" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle action={<Button size="sm" onClick={() => setLog(true)}>ביצעתי שגרה</Button>}>
            <span className="flex items-center gap-2">
              <PersonStanding className="size-4 text-accent" /> שגרת יציבה — 5-7 דק׳
            </span>
          </SectionTitle>
          <ol className="space-y-3">
            {routine.map((r, i) => (
              <li key={r.name} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs">{i + 1}</span>
                <div>
                  <div className="font-medium">
                    {r.name} <span className="text-xs text-accent">· {r.reps}</span>
                  </div>
                  <div className="text-muted">{r.how}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-dim">השבוע: {postureSessions} שגרות יציבה מתועדות</p>
        </Card>
        <Card>
          <SectionTitle action={<Button size="sm" variant="secondary" icon={<ClipboardCheck className="size-4" />} onClick={() => setCheckin(true)}>Check-in</Button>}>
            מודעות ליציבה (דיווח עצמי 1-5)
          </SectionTitle>
          <TrendArea data={data} />
          <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">
            <b className="text-fg">בדיקה מהירה (30 שנ׳):</b> עמידה ליד קיר — עקבים, ישבן, שכמות וראש נוגעים בקיר בנוחות? אוזניים מעל הכתפיים? זו בדיקה עצמית, לא אבחון.
          </div>
        </Card>
      </div>
      <WorkoutModal open={log} onClose={() => setLog(false)} preset={{ type: "posture", durationMin: 7, notes: "שגרת יציבה" }} />
      <CheckinModal open={checkin} onClose={() => setCheckin(false)} />
    </div>
  );
}

function Sleep() {
  const checkins = useStore((s) => s.checkins);
  const [checkin, setCheckin] = useState(false);
  const data = lastNDays(14).map((d) => ({ label: heDayShort(d), value: checkins[d]?.sleepHours ?? null }));
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const profile = useStore((s) => s.profile)!;
  const target = profile.age < 18 ? "8-10" : profile.age > 64 ? "7-8" : "7-9";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="ממוצע 14 ימים" value={avg ? `${avg.toFixed(1)} ש׳` : "—"} icon={<Moon className="size-4" />} />
        <Stat label="יעד מומלץ לגילך" value={`${target} ש׳`} accent="green" />
        <Stat label="לילות מתועדים" value={vals.length} />
      </div>
      <Card>
        <SectionTitle action={<Button size="sm" onClick={() => setCheckin(true)}>תיעוד שינה</Button>}>שעות שינה</SectionTitle>
        {vals.length ? <TrendArea data={data} unit=" ש׳" /> : <p className="py-8 text-center text-sm text-muted">תעדו שינה ב-Daily Check-in כדי לראות גרף</p>}
      </Card>
      <Card>
        <SectionTitle>הרגלי שינה שעובדים</SectionTitle>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["⏰", "שעת שינה וקימה קבועות", "גם בסופ״ש (±1 שעה)"],
            ["☀️", "אור יום בבוקר", "10 דק׳ בחוץ בשעה הראשונה"],
            ["☕", "בלי קפאין אחרי 14:00", "קפאין נשאר בגוף 6+ שעות"],
            ["📵", "30 דק׳ בלי מסכים", "טלפון נטען מחוץ למיטה"],
            ["🌡️", "חדר קריר וחשוך", "18-20 מעלות, וילון/מסכת עיניים"],
            ["🧘", "טקס הירגעות", "מקלחת, קריאה, נשימות 4-7-8"],
          ].map(([e, t, d]) => (
            <div key={t} className="flex gap-3 rounded-xl bg-surface-2 p-3">
              <span className="text-xl">{e}</span>
              <div>
                <div className="font-medium">{t}</div>
                <div className="text-xs text-muted">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <CheckinModal open={checkin} onClose={() => setCheckin(false)} />
    </div>
  );
}

function Nutrition() {
  const checkins = useStore((s) => s.checkins);
  const profile = useStore((s) => s.profile)!;
  const [checkin, setCheckin] = useState(false);
  const water = lastNDays(14).map((d) => ({ label: heDayShort(d), value: checkins[d]?.waterGlasses ?? 0 }));
  const veggieDays = lastNDays(7).filter((d) => checkins[d]?.ateVeggies).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="ימים עם ירקות (7 ימים)" value={`${veggieDays}/7`} icon={<Apple className="size-4" />} accent="green" />
        <Stat label="מים היום" value={`${checkins[dateKey()]?.waterGlasses ?? 0} כוסות`} />
      </div>
      <Card>
        <SectionTitle action={<Button size="sm" onClick={() => setCheckin(true)}>עדכון</Button>}>כוסות מים — 14 ימים</SectionTitle>
        <WeeklyBars data={water} unit=" כוסות" />
      </Card>
      <Card>
        <SectionTitle>הרגלי תזונה בריאים — בלי דיאטות</SectionTitle>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["🥗", "חצי צלחת ירקות", "בארוחות העיקריות"],
            ["🍳", "חלבון בכל ארוחה", "ביצים, קטניות, יוגורט, דגים, עוף, טופו"],
            ["🌾", "פחמימות מלאות", "שיבולת שועל, אורז מלא, לחם מלא"],
            ["💧", "מים כמשקה עיקרי", "8 כוסות כנקודת התחלה"],
            ["🍎", "נשנוש חכם", "פרי, אגוזים, יוגורט"],
            ["⏱️", "לאכול לאט", "20 דקות לארוחה, בלי מסך"],
          ].map(([e, t, d]) => (
            <div key={t} className="flex gap-3 rounded-xl bg-surface-2 p-3">
              <span className="text-xl">{e}</span>
              <div>
                <div className="font-medium">{t}</div>
                <div className="text-xs text-muted">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-dim">
          {profile.age < 18
            ? "בגיל ההתבגרות הגוף צריך אנרגיה לגדילה — לא מומלץ לספור קלוריות או לדלג על ארוחות. בכל שאלה — רופא/ה או דיאטנית."
            : "אין כאן ספירת קלוריות או דיאטות קיצוניות. לצרכים מיוחדים — דיאטנית קלינית."}
        </p>
      </Card>
      <CheckinModal open={checkin} onClose={() => setCheckin(false)} />
    </div>
  );
}

function Clothes() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { t: "התאמת מידה", i: ["כתפיים: התפר צריך לשבת בקצה הכתף", "שרוולים: נגמרים בעצם שורש כף היד", "מכנס: נופל נקי על הנעל, בלי קפלים רבים", "גזרה מעט מותאמת > רחב מאוד או צמוד מאוד"] },
        { t: "בגדי אימון", i: ["בדים נושמים (dry-fit) לאימונים", "נעלי ריצה/אימון מתאימות — ההשקעה החשובה", "גרביים ייעודיות מונעות שלפוחיות", "סט אחד שאוהבים = יותר מוטיבציה"] },
        { t: "יציבה ובגדים", i: ["חולצות עם כתפיים מובנות מדגישות יציבה טובה", "צבעים כהים למטה ובהירים למעלה יוצרים איזון", "חגורה בגוון הנעליים מסדרת את המראה", "בגד שנוח לזוז בו = עמידה טבעית יותר"] },
        { t: "ביטחון", i: ["ללבוש מה שגורם לך להרגיש טוב — לא מה שמסתיר", "להתלבש לגוף של היום, לא לגוף 'אחרי'", "3-4 לבושים קבועים שאוהבים מורידים לחץ", "השתמשו ב-Style Analyzer למשוב על התאמת פריטים"] },
      ].map((c) => (
        <Card key={c.t}>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Shirt className="size-4 text-accent" /> {c.t}
            </span>
          </SectionTitle>
          <ul className="space-y-1.5 text-sm text-muted">
            {c.i.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function BodyRatings() {
  const [image, setImage] = useState<Blob | null>(null);
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <SectionTitle>תמונת גוף מלא</SectionTitle>
        <ImageUploader value={image} onChange={setImage} hint="עמידה טבעית, גוף מלא בפריים" tips={["לבוש צמוד או ספורטיבי", "אור יום, רקע פשוט", "מצלמה בגובה המותניים, במרחק 2-3 מטר", "צלמו תמיד באותם תנאים כדי לעקוב אחרי מגמה"]} />
      </Card>
      <div className="lg:col-span-3">
        <PhotoRatings scope="body" image={image} />
        <p className="mt-3 text-xs text-dim">אין הערכה של אחוז שומן, משקל, מסת שריר או כוח. הדירוג הוא התרשמות ויזואלית מהפוזה בתמונה בלבד.</p>
      </div>
    </div>
  );
}
