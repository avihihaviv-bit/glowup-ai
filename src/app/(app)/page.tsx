"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ScanFace,
  ClipboardCheck,
  Flame,
  Trophy,
  Sun,
  Moon,
  Lightbulb,
  Sparkles,
  ChevronDown,
  SlidersHorizontal,
  History,
  Heart,
  Activity,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useStore, dayScore, computeStreak, computeXP, useTodayTasks } from "@/lib/store";
import { levelFor, planDay } from "@/lib/plan";
import { topPriorities } from "@/lib/priorities";
import { CATEGORY_META, cn, dateKey, greeting, heDate, heDayShort, lastNDays } from "@/lib/utils";
import { tipOfTheDay, EVIDENCE_LABEL } from "@/data/tips";
import { useLang, useT } from "@/lib/i18n";
import { Badge, Button, Card, EmptyState, Modal, ProgressBar, Ring, SectionTitle } from "@/components/ui";
import { TaskItem } from "@/components/tasks";
import { CheckinModal } from "@/components/CheckinModal";
import { WeeklyBars } from "@/components/charts";
import { PrioritiesCard } from "@/components/Priorities";
import { FaceVisual } from "@/components/FaceVisual";

const WIDGETS = [
  { id: "priorities", label: "3 העדיפויות שלך" },
  { id: "weekly", label: "עקביות שבועית" },
  { id: "recentScan", label: "סריקה אחרונה" },
  { id: "tip", label: "טיפ היום" },
  { id: "routine", label: "השגרה הבאה" },
  { id: "products", label: "מוצרים שמורים" },
  { id: "timeline", label: "ציר התקדמות" },
] as const;

export default function Dashboard() {
  const s = useStore();
  const t = useT();
  const lang = useLang();
  const profile = s.profile!;
  const today = dateKey();
  const tasks = useTodayTasks(today);
  const score = dayScore(s, today);
  const streak = computeStreak(s);
  const lvl = levelFor(computeXP(s));
  const day = planDay(s.plan, today);
  const hidden = new Set(s.hiddenWidgets);
  const show = (id: string) => !hidden.has(id);
  const lastScan = s.scans[0];
  const [checkin, setCheckin] = useState(false);
  const [explain, setExplain] = useState(false);
  const [customize, setCustomize] = useState(false);
  const Arrow = lang === "he" ? ArrowLeft : ArrowRight;

  const { top } = useMemo(
    () =>
      topPriorities({
        profile: s.profile,
        concerns: s.concerns,
        checkins: s.checkins,
        workouts: s.workouts,
        analyses: s.analyses,
        products: s.products,
        favorites: s.favorites,
        priorityPins: s.priorityPins,
      }),
    [s.profile, s.concerns, s.checkins, s.workouts, s.analyses, s.products, s.favorites, s.priorityPins],
  );
  const rec = top[0];

  // score breakdown by category (what the user controls today)
  const done = new Set(s.completions[today] ?? []);
  const byCat = Object.entries(
    tasks.reduce<Record<string, { done: number; total: number }>>((acc, tk) => {
      acc[tk.category] ??= { done: 0, total: 0 };
      acc[tk.category].total++;
      if (done.has(tk.id)) acc[tk.category].done++;
      return acc;
    }, {}),
  );

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="grid gap-5 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] border border-white bg-gradient-to-br from-white via-white to-accent-soft p-6 shadow-lift lg:col-span-2 sm:p-8">
          <div className="pointer-events-none absolute -end-24 -top-28 size-80 rounded-full bg-cyan/20 blur-3xl" />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm text-muted">{greeting()},</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">{profile.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="accent">
                  <Trophy className="size-3" /> רמה {lvl.level} · {lvl.name}
                </Badge>
                <Badge>
                  <Flame className="size-3 text-warn" /> {streak.current} ימים ברצף
                </Badge>
                {day && <Badge>יום {day} / 30</Badge>}
              </div>
              <div className="mt-5 rounded-2xl border border-line bg-white/80 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-dim">
                  <ScanFace className="size-4 text-accent" /> סטטוס סריקה
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {lastScan ? `סריקה אחרונה: ${heDate(lastScan.date)} · ${lastScan.report ? "דוח AI" : "תצפיות מהמכשיר"}` : "עוד לא ביצעת סריקת פנים"}
                </div>
                <p className="mt-0.5 text-xs text-muted">ניתוח מתמונה דו-ממדית. אין כאן מדידת עומק.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/face">
                  <Button size="lg" icon={<ScanFace className="size-4" />}>
                    סריקה חדשה
                  </Button>
                </Link>
                {lastScan && (
                  <Link href="/face">
                    <Button size="lg" variant="secondary">
                      צפייה בניתוח
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="mx-auto w-56 sm:w-64">
              <FaceVisual imageId={lastScan?.images.front} label={lastScan ? "התמונה מהסריקה האחרונה" : "איור להמחשה"} />
            </div>
          </div>
        </motion.div>

        {/* DAILY SCORE */}
        <Card className="flex flex-col items-center text-center">
          <div className="text-sm font-semibold">Daily Glow-Up Score</div>
          <p className="mb-3 text-[11px] text-dim">מבוסס על פעולות שבשליטתך, לא על מראה</p>
          <Ring value={score.score} size={168} stroke={14}>
            <span className="text-4xl font-extrabold tabular-nums">{score.score}</span>
            <span className="text-xs text-dim">מתוך 100</span>
          </Ring>
          <p className="mt-3 text-sm text-muted">
            {score.done}/{score.total} משימות · {score.checkin ? "Check-in ✓" : "Check-in ממתין"}
          </p>
          <div className="mt-3 flex w-full flex-col gap-2">
            <Button variant="secondary" icon={<ClipboardCheck className="size-4" />} onClick={() => setCheckin(true)}>
              {score.checkin ? "עדכון Check-in" : "Daily Check-in"}
            </Button>
            <button onClick={() => setExplain((e) => !e)} className="inline-flex min-h-10 items-center justify-center gap-1 text-xs text-accent" aria-expanded={explain}>
              איך זה מחושב? <ChevronDown className={cn("size-3.5 transition", explain && "rotate-180")} />
            </button>
          </div>
          {explain && (
            <div className="mt-1 w-full space-y-2 rounded-2xl bg-surface-2 p-3 text-start text-xs text-muted">
              <p>
                (משימות שהושלמו + Check-in) ÷ (כל משימות היום + 1) × 100. ציון היום: ({score.done} + {score.checkin ? 1 : 0}) ÷ ({score.total} + 1).
              </p>
              {byCat.map(([cat, v]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span>{CATEGORY_META[cat]?.label}</span>
                  <span className="tabular-nums">
                    {v.done}/{v.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* SMART RECOMMENDATION */}
      {rec && (
        <Link href={rec.href}>
          <Card interactive className="flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan to-accent text-white">
              <Sparkles className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-accent">ההמלצה החכמה להיום</div>
              <div className="font-semibold">{rec.kind === "concern" ? rec.title : t(`prio.${rec.key}.title`)}</div>
              <p className="truncate text-sm text-muted">{t(rec.kind === "concern" ? "prio.concern.do" : `prio.${rec.key}.do`)}</p>
            </div>
            <Arrow className="size-5 shrink-0 text-dim" />
          </Card>
        </Link>
      )}

      {/* TODAY + SIDE WIDGETS */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            action={
              <Link href="/plan" className="text-xs font-medium text-accent">
                כל התוכנית
              </Link>
            }
          >
            התוכנית של היום
          </SectionTitle>
          {tasks.length ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <ProgressBar value={tasks.length ? (score.done / tasks.length) * 100 : 0} />
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {score.done}/{tasks.length}
                </span>
              </div>
              <div className="grid max-h-[420px] gap-2 overflow-y-auto pe-1">
                {tasks.map((tk) => (
                  <TaskItem key={tk.id} task={tk} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={<ClipboardCheck className="size-5" />} title="אין משימות להיום" text="צרו תוכנית או בקשו מהמאמן משימות." action={<Link href="/plan"><Button size="sm">לתוכנית</Button></Link>} />
          )}
        </Card>
        <div className="space-y-5">
          {show("tip") && <TipWidget />}
          {show("routine") && <RoutineWidget />}
        </div>
      </div>

      {show("priorities") && <PrioritiesCard />}

      <div className="grid gap-5 lg:grid-cols-2">
        {show("weekly") && (
          <Card>
            <SectionTitle>עקביות שבועית</SectionTitle>
            <WeeklyBars data={lastNDays(7).map((d) => ({ label: heDayShort(d), value: dayScore(s, d).score }))} />
          </Card>
        )}
        {show("recentScan") && <RecentScanWidget />}
        {show("products") && <ProductsWidget />}
        {show("timeline") && <TimelineWidget />}
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" size="sm" icon={<SlidersHorizontal className="size-4" />} onClick={() => setCustomize(true)}>
          התאמה אישית של הדשבורד
        </Button>
      </div>

      <CheckinModal open={checkin} onClose={() => setCheckin(false)} />
      <Modal open={customize} onClose={() => setCustomize(false)} title="התאמה אישית של הדשבורד">
        <p className="mb-3 text-sm text-muted">בחרו אילו ווידג׳טים להציג.</p>
        <div className="space-y-2">
          {WIDGETS.map((w) => (
            <label key={w.id} className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-white px-3 text-sm">
              {w.label}
              <input type="checkbox" className="size-5" checked={show(w.id)} onChange={() => s.toggleWidget(w.id)} />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function TipWidget() {
  const hidden = useStore((s) => s.tipHidden);
  const goals = useStore((s) => s.profile?.goals ?? []);
  const prefer = goals.flatMap((g) => ({ grooming: ["grooming", "face"], haircut: ["hairStyling"], skin: ["skin", "face"], hairHealth: ["hairCare"], muscle: ["posture"], posture: ["posture"], growth: ["sleep", "nutrition"], sleep: ["sleep"], nutrition: ["nutrition"], puffiness: ["puffiness"], style: ["style"], confidence: ["grooming", "style"] } as Record<string, string[]>)[g] ?? []);
  const tip = tipOfTheDay(dateKey(), hidden, prefer);
  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Lightbulb className="size-4 text-warn" /> טיפ היום
        </span>
      </SectionTitle>
      <div className="font-semibold">{tip.title}</div>
      <p className="mt-1 text-sm text-muted">{tip.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="accent">{EVIDENCE_LABEL[tip.evidence]}</Badge>
        {tip.minutes > 0 && <Badge>{tip.minutes} דק׳</Badge>}
        <Badge>{tip.when}</Badge>
      </div>
      {tip.warning && <p className="mt-2 text-xs text-warn">{tip.warning}</p>}
      <Link href="/tips" className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-accent">
        לכל 350 הטיפים
      </Link>
    </Card>
  );
}

function RoutineWidget() {
  const plan = useStore((s) => s.plan);
  const hour = new Date().getHours();
  const morning = hour < 14;
  const steps = plan ? (morning ? plan.morningRoutine : plan.eveningRoutine) : [];
  return (
    <Card>
      <SectionTitle
        action={
          <Link href="/plan#routines" className="text-xs font-medium text-accent">
            הכל
          </Link>
        }
      >
        <span className="flex items-center gap-2">
          {morning ? <Sun className="size-4 text-warn" /> : <Moon className="size-4 text-accent" />} {morning ? "שגרת הבוקר" : "שגרת הערב"}
        </span>
      </SectionTitle>
      {steps.length ? (
        <ol className="space-y-2">
          {steps.slice(0, 4).map((st, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{st.step}</span>
              <span className="text-xs text-dim">{st.minutes} דק׳</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">אין שגרה בתוכנית עדיין.</p>
      )}
    </Card>
  );
}

function RecentScanWidget() {
  const last = useStore((s) => s.analyses[0]);
  const labels: Record<string, string> = { face: "ניתוח פנים", hair: "ניתוח שיער", style: "ניתוח לבוש", skin: "שגרת עור", ratings: "דירוג תמונה" };
  const hrefs: Record<string, string> = { face: "/face", hair: "/hair", style: "/style", skin: "/skin", ratings: "/face" };
  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <History className="size-4 text-accent" /> הניתוח האחרון
        </span>
      </SectionTitle>
      {last ? (
        <Link href={hrefs[last.type] ?? "/"} className="flex items-center justify-between rounded-2xl border border-line bg-white p-3">
          <div>
            <div className="font-semibold">{labels[last.type] ?? last.type}</div>
            <div className="text-xs text-muted">{heDate(last.date)}</div>
          </div>
          <Badge tone={last.source === "ai" ? "accent" : "warn"}>{last.source === "ai" ? "AI" : "דמו"}</Badge>
        </Link>
      ) : (
        <p className="text-sm text-muted">עוד אין ניתוחים. התחילו בסריקת פנים.</p>
      )}
    </Card>
  );
}

function ProductsWidget() {
  const products = useStore((s) => s.products);
  return (
    <Card>
      <SectionTitle
        action={
          <Link href="/skin" className="text-xs font-medium text-accent">
            ניהול
          </Link>
        }
      >
        <span className="flex items-center gap-2">
          <Heart className="size-4 text-accent" /> מוצרים שמורים
        </span>
      </SectionTitle>
      {products.length ? (
        <ul className="space-y-1.5 text-sm">
          {products.slice(0, 5).map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span className="truncate">{p.name}</span>
              {p.liked && <Heart className="size-3.5 fill-accent text-accent" />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">עוד לא שמרת מוצרים.</p>
      )}
    </Card>
  );
}

function TimelineWidget() {
  const s = useStore();
  const events = useMemo(() => {
    const out: { date: string; text: string }[] = [];
    for (const [d, ids] of Object.entries(s.completions)) if (ids.length) out.push({ date: d, text: `${ids.length} משימות הושלמו` });
    for (const d of Object.keys(s.checkins)) out.push({ date: d, text: "Check-in יומי" });
    for (const w of s.workouts) out.push({ date: w.date, text: `אימון ${w.durationMin} דק׳` });
    for (const a of s.analyses) out.push({ date: a.date, text: "ניתוח חדש" });
    return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [s.completions, s.checkins, s.workouts, s.analyses]);
  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Activity className="size-4 text-accent" /> ציר התקדמות
        </span>
      </SectionTitle>
      {events.length ? (
        <ol className="relative space-y-3 border-s border-line ps-4">
          {events.map((e, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full border-2 border-white bg-accent" />
              <span className="font-medium">{e.text}</span> <span className="text-xs text-dim">· {heDate(e.date)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">ההתקדמות שלך תופיע כאן.</p>
      )}
    </Card>
  );
}
