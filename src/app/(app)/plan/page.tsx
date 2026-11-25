"use client";
import { useState } from "react";
import { CalendarCheck, Moon, RefreshCw, Sun, Clock, Sparkles } from "lucide-react";
import { useStore, dayScore } from "@/lib/store";
import { planDay } from "@/lib/plan";
import { createPlan } from "@/lib/planActions";
import { addDays, CATEGORY_META, cn, dateKey, heDate } from "@/lib/utils";
import { useAIStatus } from "@/lib/api";
import { Badge, Button, Card, EmptyState, ErrorBox, Modal, PageHeader, ProgressBar, SectionTitle, SourceNotice } from "@/components/ui";
import { TaskItem } from "@/components/tasks";
import { tasksForDate } from "@/lib/plan";

export default function PlanPage() {
  const s = useStore();
  const plan = s.plan;
  const today = dateKey();
  const todayDay = planDay(plan, today);
  const [selected, setSelected] = useState<number>(todayDay ?? 1);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ai = useAIStatus();

  async function regenerate(forceDemo = false) {
    setBusy(true);
    setError(null);
    const { plan: p, aiError } = await createPlan(s.profile!, { forceDemo });
    if (aiError) setError(`יצירת תוכנית AI נכשלה: ${aiError}. נוצרה תוכנית דמו במקום.`);
    s.setPlan(p);
    setSelected(1);
    setBusy(false);
    setConfirm(false);
  }

  if (!plan) {
    return (
      <div>
        <PageHeader title="תוכנית 30 יום" icon={<CalendarCheck className="size-5" />} />
        <EmptyState
          icon={<CalendarCheck className="size-5" />}
          title="אין תוכנית פעילה"
          text="ניצור תוכנית מותאמת לפי הפרופיל והמטרות שלך."
          action={<Button loading={busy} onClick={() => regenerate()}>צור תוכנית</Button>}
        />
      </div>
    );
  }

  const selDate = addDays(plan.startDate, selected - 1);
  const selTasks = tasksForDate(plan, selDate, s.customTasks);
  const selMinutes = selTasks.reduce((a, t) => a + t.minutes, 0);
  const week = Math.min(Math.ceil(selected / 7), 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="תוכנית 30 יום"
        subtitle={`התחלה: ${heDate(plan.startDate)} · ${plan.tasks.length} משימות בספריית התוכנית`}
        icon={<CalendarCheck className="size-5" />}
        actions={
          <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={() => setConfirm(true)}>
            תוכנית חדשה
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}
      <SourceNotice source={plan.source} />

      <Card>
        <p className="text-sm leading-relaxed text-muted">{plan.summary}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {plan.weeks.map((w) => (
            <div key={w.week} className={cn("rounded-xl border p-3 text-sm", w.week === week ? "border-accent bg-accent-soft" : "border-line bg-surface-2")}>
              <div className="inline-flex min-h-9 items-center text-xs font-medium text-accent">שבוע {w.week}</div>
              <div className="mt-1 text-[13px] leading-snug">{w.focus}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Calendar */}
      <Card>
        <SectionTitle action={todayDay && <Badge tone="green">היום: יום {todayDay}</Badge>}>לוח 30 הימים</SectionTitle>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {plan.days.map((d) => {
            const date = addDays(plan.startDate, d.day - 1);
            const sc = dayScore(s, date);
            const isToday = d.day === todayDay;
            const future = date > today;
            return (
              <button
                key={d.day}
                onClick={() => setSelected(d.day)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition",
                  selected === d.day ? "border-accent ring-2 ring-accent-soft" : "border-line",
                  isToday && "bg-accent-soft",
                  !future && sc.score >= 80 && "bg-green-soft",
                )}
              >
                <span className={cn("font-semibold", future && "text-dim")}>{d.day}</span>
                {!future && sc.total > 0 && <span className="text-[10px] text-muted">{sc.score}%</span>}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle
            action={
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Clock className="size-3" /> ~{selMinutes} דק׳
              </span>
            }
          >
            יום {selected} · {heDate(selDate)}
          </SectionTitle>
          {selDate > today && <p className="mb-3 text-xs text-dim">תצוגה מקדימה — אפשר לסמן משימות רק עבור היום והימים שעברו.</p>}
          <div className={cn("grid gap-2", selDate > today && "pointer-events-none opacity-70")}>
            {selTasks.map((t) => (
              <TaskItem key={t.id} task={t} date={selDate} />
            ))}
            {!selTasks.length && <p className="text-sm text-muted">יום מנוחה</p>}
          </div>
          {selTasks.length > 0 && (
            <div className="mt-4">
              <ProgressBar value={dayScore(s, selDate).score} color="green" />
            </div>
          )}
        </Card>

        <div id="routines" className="space-y-4 lg:col-span-2">
          <RoutineCard title="שגרת בוקר" icon={<Sun className="size-4 text-warn" />} steps={plan.morningRoutine} />
          <RoutineCard title="שגרת ערב" icon={<Moon className="size-4 text-accent" />} steps={plan.eveningRoutine} />
        </div>
      </div>

      <Card>
        <SectionTitle>ספריית המשימות בתוכנית</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {plan.tasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-surface-2/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{t.title}</div>
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: CATEGORY_META[t.category]?.color }} />
              </div>
              <div className="mt-1 text-xs text-dim">
                {{ daily: "יומי", "3x_week": "3× בשבוע", weekly: "שבועי", once: "חד-פעמי" }[t.frequency]} · משבוע {t.startWeek}
                {t.minutes > 0 && ` · ${t.minutes} דק׳`}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{t.how}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="ליצור תוכנית חדשה?">
        <p className="text-sm text-muted">
          התוכנית הנוכחית תוחלף ותתחיל מהיום. היסטוריית ההשלמות שלך נשמרת (XP ורצפים לא נמחקים).
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {ai.aiEnabled && (
            <Button loading={busy} icon={<Sparkles className="size-4" />} onClick={() => regenerate()}>
              תוכנית AI מותאמת (לפי הניתוחים וההתקדמות)
            </Button>
          )}
          <Button variant="secondary" loading={busy && !ai.aiEnabled} onClick={() => regenerate(true)}>
            תוכנית מספריית המשימות {ai.aiEnabled ? "(ללא AI)" : "(מצב דמו)"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function RoutineCard({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: { step: string; how: string; minutes: number }[] }) {
  const total = steps.reduce((a, b) => a + b.minutes, 0);
  return (
    <Card>
      <SectionTitle action={<span className="text-xs text-muted">~{total} דק׳</span>}>
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
      </SectionTitle>
      <ol className="space-y-2.5">
        {steps.map((st, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-semibold">{i + 1}</span>
            <div className="text-sm">
              <div className="font-medium">
                {st.step} <span className="text-xs font-normal text-dim">· {st.minutes} דק׳</span>
              </div>
              <div className="text-xs text-muted">{st.how}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
