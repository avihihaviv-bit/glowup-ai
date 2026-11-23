"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Plus, Trash2, Check, Clock, MessageCircleHeart, SprayCan } from "lucide-react";
import { useStore } from "@/lib/store";
import type { EventType, OutingPlan } from "@/lib/types";
import { OUTING_TIPS } from "@/data/tips";
import { cn, now, uid } from "@/lib/utils";
import { Badge, Button, Card, Chip, EmptyState, Field, Input, PageHeader, ProgressBar, Ring, SectionTitle } from "@/components/ui";
import { TipCard } from "@/components/TipCard";
import { WeatherCard, useWeather } from "@/components/WeatherCard";

const EVENTS: { id: EventType; label: string }[] = [
  { id: "casual", label: "יציאה רגילה" },
  { id: "school", label: "אירוע בית ספר" },
  { id: "birthday", label: "יום הולדת" },
  { id: "barMitzvah", label: "בר/בת מצווה" },
  { id: "family", label: "אירוע משפחתי" },
  { id: "date", label: "דייט / מפגש חברתי" },
  { id: "party", label: "מסיבה" },
  { id: "formal", label: "אירוע רשמי" },
  { id: "outdoor", label: "אירוע בחוץ" },
];

const READY = [
  ["hair", "שיער"],
  ["skin", "פנים ועור"],
  ["teeth", "שיניים"],
  ["breath", "נשימה"],
  ["fragrance", "בושם"],
  ["clothing", "לבוש"],
  ["shoes", "נעליים"],
  ["nails", "ציפורניים"],
  ["essentials", "תיק וציוד"],
] as const;

/** Get-ready timeline, relative to the event start (minutes before). */
function timeline(p: OutingPlan) {
  const formal = p.type === "formal" || p.type === "barMitzvah" || p.type === "family";
  return [
    { id: "t-outfit", at: formal ? 150 : 120, title: "בחירת לבוש וגיהוץ", how: "לבוש, נעליים וחגורה. לבדוק כתמים וקמטים." },
    { id: "t-shower", at: 90, title: "מקלחת", how: "מקלחת קצרה, ייבוש טוב ודאודורנט על עור יבש." },
    { id: "t-groom", at: 75, title: "גילוח וטיפוח פנים", how: "שגרת העור הרגילה, בלי מוצרים חדשים." + (p.weather === "hot" || p.type === "outdoor" ? " קרם הגנה." : "") },
    { id: "t-hair", at: 60, title: "שיער", how: p.weather === "rain" ? "מוצר עם אחיזה טובה. מטריה או כובע." : "עיצוב עם כמות קטנה של מוצר, לבדוק מכל הצדדים." },
    { id: "t-teeth", at: 40, title: "צחצוח וניקוי בין השיניים", how: "שתי דקות, חוט דנטלי, ניקוי לשון." },
    { id: "t-dress", at: 30, title: "התלבשות", how: "להמתין שהדאודורנט יתייבש. צילום מראה." },
    { id: "t-scent", at: 20, title: "בושם", how: p.indoor ? "1-2 התזות בחלל סגור, על החזה או הצוואר." : "1-2 התזות, לא על הפנים." },
    { id: "t-final", at: 10, title: "בדיקה אחרונה ותיק", how: "שיניים, שיער, צווארון, טלפון טעון, ממחטות ומים." },
  ];
}

function relevantTips(p: OutingPlan) {
  const cats = new Set(["oFragrance", "oOral", "oSkin", "oHair", "oOutfit", "oHygiene", "oFinal", "oBag"]);
  return OUTING_TIPS.filter((t) => cats.has(t.category))
    .map((t) => {
      let s = t.importance === "high" ? 3 : t.importance === "medium" ? 2 : 1;
      const txt = t.title + t.description + t.when;
      if (p.weather === "hot" && /חם|קיץ|נושם|זיעה/.test(txt)) s += 3;
      if (p.weather === "cold" && /חורף|קר|שכבה/.test(txt)) s += 3;
      if (p.weather === "rain" && /לח|רוח|פריז/.test(txt)) s += 3;
      if (p.indoor && /בפנים|סגור|אולם/.test(txt)) s += 2;
      if (!p.indoor && /בחוץ|SPF|הגנה|רוח/.test(txt)) s += 2;
      if (p.type === "date" && /דייט|מקרוב/.test(txt)) s += 3;
      if ((p.type === "party" || p.type === "barMitzvah") && /ריקוד|חולצה נוספת|ארוך/.test(txt)) s += 3;
      if ((p.type === "formal" || p.type === "barMitzvah") && /קוד לבוש|מכופתרת|חגורה|גיהוץ/.test(txt)) s += 2;
      return { t, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 9)
    .map((x) => x.t);
}

export default function OutingPage() {
  const router = useRouter();
  const outings = useStore((s) => s.outings);
  const add = useStore((s) => s.addOuting);
  const update = useStore((s) => s.updateOuting);
  const remove = useStore((s) => s.removeOuting);
  const fragrances = useStore((s) => s.fragrances);
  const { weather } = useWeather();
  const [nowTs, setNowTs] = useState(() => now());
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const d = new Date(now() + 3 * 3600_000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return { type: "birthday" as EventType, title: "", start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`, indoor: true, weather: "mild" as OutingPlan["weather"] };
  });

  useEffect(() => {
    const t = setInterval(() => setNowTs(now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const effectiveWeather = weather?.kind ?? form.weather;

  const plan = outings.find((o) => o.id === selected) ?? outings.find((o) => new Date(o.start).getTime() > nowTs - 3 * 3600_000) ?? null;
  const tl = plan ? timeline(plan) : [];
  const minsLeft = plan ? Math.round((new Date(plan.start).getTime() - nowTs) / 60000) : 0;
  const readyDone = plan ? READY.filter(([k]) => plan.checks[k]).length : 0;
  const readyPct = Math.round((readyDone / READY.length) * 100);
  const tips = plan ? relevantTips(plan) : [];
  const scent = (() => {
    if (!plan || !fragrances.length) return null;
    const occ = plan.type === "date" ? "דייט" : plan.type === "formal" || plan.type === "barMitzvah" || plan.type === "family" ? "אירוע" : plan.type === "party" ? "ערב" : "יומיומי";
    return [...fragrances].sort((a, b) => Number(b.occasions.includes(occ)) * 3 + b.rating - (Number(a.occasions.includes(occ)) * 3 + a.rating))[0];
  })();

  function create() {
    const label = EVENTS.find((e) => e.id === form.type)!.label;
    const o: OutingPlan = { id: uid("out"), type: form.type, title: form.title.trim() || label, start: new Date(form.start).toISOString(), weather: effectiveWeather, indoor: form.indoor, checks: {}, createdAt: new Date().toISOString() };
    add(o);
    setSelected(o.id);
  }

  const toggle = (k: string) => plan && update(plan.id, { checks: { ...plan.checks, [k]: !plan.checks[k] } });
  const fmt = (m: number) => (m <= 0 ? "עכשיו" : m < 60 ? `בעוד ${m} דק׳` : `בעוד ${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} שעות`);

  return (
    <div className="space-y-6">
      <PageHeader title="Outing Mode" subtitle="עוזר Get Ready: לוח זמנים לפני האירוע, צ׳קליסט מוכנות וטיפים מותאמים." icon={<PartyPopper className="size-5" />} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <SectionTitle>אירוע חדש</SectionTitle>
          <Field label="סוג האירוע">
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((e) => (
                <Chip key={e.id} active={form.type === e.id} onClick={() => setForm({ ...form, type: e.id, indoor: e.id === "outdoor" ? false : form.indoor })}>
                  {e.label}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם (אופציונלי)">
              <Input id="out-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="למשל: יום הולדת של דניאל" maxLength={60} />
            </Field>
            <Field label="מתי מתחיל">
              <Input id="out-start" type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Field label="מקום">
              <div className="flex gap-2">
                <Chip active={form.indoor} onClick={() => setForm({ ...form, indoor: true })}>בפנים</Chip>
                <Chip active={!form.indoor} onClick={() => setForm({ ...form, indoor: false })}>בחוץ</Chip>
              </div>
            </Field>
            <Field label={weather ? `מזג אוויר (לפי ${weather.temp}° היום)` : "מזג אוויר"}>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["hot", "חם"],
                    ["mild", "נעים"],
                    ["cold", "קר"],
                    ["rain", "גשום"],
                  ] as const
                ).map(([v, l]) => (
                  <Chip key={v} active={effectiveWeather === v} onClick={() => setForm({ ...form, weather: v })}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
          <Button size="lg" icon={<Plus className="size-4" />} onClick={create}>
            יצירת תוכנית הכנה
          </Button>
        </Card>
        <WeatherCard />
      </div>

      {plan ? (
        <>
          <Card className="bg-gradient-to-br from-white to-accent-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-muted">{EVENTS.find((e) => e.id === plan.type)?.label}</div>
                <div className="text-2xl font-extrabold">{plan.title}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="accent">
                    <Clock className="size-3" /> {fmt(minsLeft)}
                  </Badge>
                  <Badge>{plan.indoor ? "בפנים" : "בחוץ"}</Badge>
                  <Badge>{{ hot: "חם", mild: "נעים", cold: "קר", rain: "גשום" }[plan.weather]}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Ring value={readyPct} size={96} stroke={9}>
                  <span className="text-xl font-extrabold">{readyPct}%</span>
                  <span className="text-[10px] text-dim">מוכנות</span>
                </Ring>
                <Button variant="ghost" size="sm" icon={<MessageCircleHeart className="size-4" />} onClick={() => router.push(`/coach?q=${encodeURIComponent(`יש לי ${plan.title} ${fmt(minsLeft)}. תעזור לי להתכונן לפי מה שאתה יודע עליי?`)}`)}>
                  שאלו את המאמן
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <SectionTitle>לוח זמנים לפני האירוע</SectionTitle>
              <ol className="relative space-y-3 border-s border-line ps-5">
                {tl.map((s) => {
                  const due = minsLeft <= s.at;
                  const done = !!plan.checks[s.id];
                  return (
                    <li key={s.id} className="relative">
                      <span className={cn("absolute -start-[27px] top-1 grid size-4 place-items-center rounded-full border-2 border-white", done ? "bg-green" : due ? "bg-accent" : "bg-surface-3")} />
                      <button onClick={() => toggle(s.id)} className={cn("w-full rounded-2xl border p-3 text-start transition", done ? "border-green/40 bg-green-soft" : due ? "border-accent/40 bg-white" : "border-line bg-white")}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{s.title}</span>
                          <span className="text-xs text-dim">{s.at} דק׳ לפני</span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted">{s.how}</p>
                        {done && <span className="mt-1 inline-flex items-center gap-1 text-xs text-green"><Check className="size-3" /> בוצע</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Card>
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <SectionTitle>צ׳קליסט מוכנות</SectionTitle>
                <ProgressBar value={readyPct} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {READY.map(([k, l]) => (
                    <button key={k} onClick={() => toggle(k)} aria-pressed={!!plan.checks[k]} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-medium transition", plan.checks[k] ? "border-accent bg-accent-soft text-accent-strong" : "border-line bg-white text-muted")}>
                      {plan.checks[k] && <Check className="size-4" />}
                      {l}
                    </button>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <SprayCan className="size-4 text-accent" /> בושם לאירוע
                  </span>
                </SectionTitle>
                {scent ? (
                  <p className="text-sm text-muted">
                    <b className="text-fg">{scent.name}</b> מהאוסף שלך. {plan.indoor ? "1-2 התזות בחלל סגור." : "עד 2 התזות."} פחות זה יותר.
                  </p>
                ) : (
                  <p className="text-sm text-muted">הוסיפו בשמים במרכז הבשמים כדי לקבל המלצה מהאוסף.</p>
                )}
              </Card>
            </div>
          </div>

          <div>
            <SectionTitle>טיפים לאירוע הזה</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tips.map((t) => (
                <TipCard key={t.id} tip={t} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={<PartyPopper className="size-5" />} title="אין אירוע קרוב" text="צרו אירוע וקבלו לוח זמנים, צ׳קליסט וטיפים." />
      )}

      {outings.length > 0 && (
        <Card>
          <SectionTitle>האירועים שלי</SectionTitle>
          <ul className="divide-y divide-line">
            {outings.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <button onClick={() => setSelected(o.id)} className="min-h-10 flex-1 text-start text-sm">
                  <span className="font-medium">{o.title}</span> <span className="text-xs text-dim">· {new Date(o.start).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </button>
                <button onClick={() => remove(o.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקת אירוע">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
