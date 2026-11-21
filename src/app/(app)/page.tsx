"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import {
  ScanFace,
  Scissors,
  Shirt,
  Droplets,
  ClipboardCheck,
  Flame,
  Trophy,
  Dumbbell,
  Moon,
  Sparkles,
  ArrowLeft,
  Sun,
  CalendarCheck,
  MessageCircleHeart,
} from "lucide-react";
import { useStore, dayScore, computeStreak, computeXP, useTodayTasks } from "@/lib/store";
import { levelFor, planDay } from "@/lib/plan";
import { dateKey, greeting, heDayShort, lastNDays } from "@/lib/utils";
import { Avatar } from "@/components/StoredImage";
import { Badge, Button, Card, EmptyState, Modal, ProgressBar, Ring, SectionTitle, Stat } from "@/components/ui";
import { TaskItem } from "@/components/tasks";
import { CheckinModal } from "@/components/CheckinModal";
import { WeeklyBars } from "@/components/charts";
import { PrioritiesCard } from "@/components/Priorities";

export default function Dashboard() {
  const s = useStore();
  const profile = s.profile!;
  const today = dateKey();
  const tasks = useTodayTasks(today);
  const score = dayScore(s, today);
  const streak = computeStreak(s);
  const xp = computeXP(s);
  const lvl = levelFor(xp);
  const day = planDay(s.plan, today);
  const week = lastNDays(7).map((d) => ({ label: heDayShort(d), value: dayScore(s, d).score }));
  const weekAvg = Math.round(week.reduce((a, b) => a + b.value, 0) / 7);
  const weekWorkouts = s.workouts.filter((w) => lastNDays(7).includes(w.date)).length;
  const sleepVals = lastNDays(7).map((d) => s.checkins[d]?.sleepHours).filter((v): v is number => typeof v === "number");
  const avgSleep = sleepVals.length ? (sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length).toFixed(1) : "—";
  const [checkin, setCheckin] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const curWeek = day ? Math.min(Math.ceil(day / 7), 4) : null;
  const focus = s.plan?.weeks.find((w) => w.week === curWeek)?.focus;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar imageId={profile.avatarImageId} name={profile.name} size={60} />
          <div>
            <p className="text-sm text-muted">{greeting()},</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{profile.name} ✨</h1>
            <p className="mt-0.5 text-sm text-muted">
              {day ? `יום ${day} מתוך 30 בתוכנית` : s.plan ? "התוכנית הסתיימה — זמן לתוכנית חדשה!" : "עוד אין תוכנית פעילה"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button size="lg" className="px-3 sm:px-6" icon={<Sparkles className="size-4" />} onClick={() => setAnalysis(true)}>
            Start Analysis
          </Button>
          <Button size="lg" variant="secondary" className="px-3 sm:px-6" icon={<ClipboardCheck className="size-4" />} onClick={() => setCheckin(true)}>
            {s.checkins[today] ? "Check-in ✓" : "Daily Check-in"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Score */}
        <Card className="flex flex-col items-center justify-center text-center">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted">Daily Glow Up Score</div>
          <Ring value={score.score} size={164} stroke={14}>
            <motion.span key={score.score} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-bold">
              {score.score}
            </motion.span>
            <span className="text-xs text-dim">מתוך 100</span>
          </Ring>
          <p className="mt-4 text-sm text-muted">
            {score.done}/{score.total} משימות {score.checkin ? "· Check-in ✓" : "· Check-in ממתין"}
          </p>
          <p className="mt-1 text-[11px] text-dim">מבוסס על השלמת הרגלים בלבד — לא על מראה.</p>
        </Card>

        {/* Today tasks */}
        <Card className="lg:col-span-2">
          <SectionTitle
            action={
              <Link href="/plan" className="flex items-center gap-1 text-xs text-accent">
                כל התוכנית <ArrowLeft className="size-3" />
              </Link>
            }
          >
            משימות להיום
          </SectionTitle>
          {tasks.length ? (
            <div className="grid max-h-[340px] gap-2 overflow-y-auto pe-1">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarCheck className="size-5" />}
              title="אין משימות להיום"
              text="צרו תוכנית חדשה או בקשו מהמאמן משימות להיום."
              action={
                <Link href="/plan">
                  <Button size="sm">לתוכנית</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>

      <PrioritiesCard />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="רצף ימים" value={`${streak.current} 🔥`} sub={`שיא: ${streak.best}`} icon={<Flame className="size-4" />} />
        <Stat label={`רמה ${lvl.level}`} value={lvl.name} sub={`${xp} XP${lvl.next ? ` · עוד ${lvl.toNext} לרמה הבאה` : ""}`} icon={<Trophy className="size-4" />} accent="green" />
        <Stat label="אימונים השבוע" value={weekWorkouts} sub="מתועדים ב'גוף וכושר'" icon={<Dumbbell className="size-4" />} />
        <Stat label="ממוצע שינה" value={avgSleep === "—" ? "—" : `${avgSleep} ש׳`} sub="לפי Check-ins (7 ימים)" icon={<Moon className="size-4" />} accent="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle action={<Badge tone="accent">ממוצע {weekAvg}%</Badge>}>התקדמות שבועית</SectionTitle>
          <WeeklyBars data={week} />
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle
            action={
              s.plan && (
                <Badge tone={s.plan.source === "ai" ? "accent" : "warn"}>{s.plan.source === "ai" ? "נוצרה ע״י AI" : "תוכנית דמו"}</Badge>
              )
            }
          >
            התוכנית האישית שלך
          </SectionTitle>
          {s.plan ? (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted">יום {day ?? 30} / 30</span>
                  <span className="font-medium">{Math.round(((day ?? 30) / 30) * 100)}%</span>
                </div>
                <ProgressBar value={((day ?? 30) / 30) * 100} />
              </div>
              {focus && (
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                  <div className="text-xs text-accent">פוקוס שבוע {curWeek}</div>
                  <div className="mt-1">{focus}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link href="/plan#routines" className="flex items-center gap-2 rounded-xl border border-line p-3 hover:bg-surface-2">
                  <Sun className="size-4 text-warn" /> שגרת בוקר
                </Link>
                <Link href="/plan#routines" className="flex items-center gap-2 rounded-xl border border-line p-3 hover:bg-surface-2">
                  <Moon className="size-4 text-accent" /> שגרת ערב
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState icon={<CalendarCheck className="size-5" />} title="אין תוכנית" action={<Link href="/plan"><Button size="sm">צור תוכנית</Button></Link>} />
          )}
        </Card>
      </div>

      <Link href="/coach">
        <Card interactive className="flex items-center gap-4 bg-gradient-to-l from-accent-soft to-transparent">
          <div className="grid size-12 place-items-center rounded-2xl bg-accent text-black">
            <MessageCircleHeart className="size-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">שאלו את המאמן האישי</div>
            <div className="text-sm text-muted">שאלות, התאמת התוכנית, משימות חדשות להיום</div>
          </div>
          <ArrowLeft className="size-5 text-muted" />
        </Card>
      </Link>

      <CheckinModal open={checkin} onClose={() => setCheckin(false)} />
      <Modal open={analysis} onClose={() => setAnalysis(false)} title="איזה ניתוח להתחיל?">
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/face", icon: ScanFace, t: "ניתוח פנים", d: "תסרוקות, גבות, משקפיים" },
            { href: "/hair", icon: Scissors, t: "ניתוח שיער", d: "תספורות ומה לבקש מהספר" },
            { href: "/style", icon: Shirt, t: "Style Analyzer", d: "התאמת צבעים ופריטים" },
            { href: "/skin", icon: Droplets, t: "שגרת טיפוח", d: "בוקר וערב מותאמים" },
          ].map((a) => (
            <Link key={a.href} href={a.href} onClick={() => setAnalysis(false)} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
              <a.icon className="size-6 text-accent" />
              <div className="mt-2 font-medium">{a.t}</div>
              <div className="text-xs text-muted">{a.d}</div>
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
}
