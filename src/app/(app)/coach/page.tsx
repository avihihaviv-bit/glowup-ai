"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MessageCircleHeart, Send, Trash2, ListPlus, Square, Sparkles, Check } from "lucide-react";
import { useStore, useTodayTasks } from "@/lib/store";
import { postJSON, profileContext, progressContext, streamCoach, useAIStatus } from "@/lib/api";
import { demoCoachReply } from "@/lib/demo";
import { TASK_LIBRARY } from "@/lib/plan";
import type { DailyTasksAI } from "@/lib/schemas";
import type { PlanTask } from "@/lib/types";
import { cn, dateKey, now, uid } from "@/lib/utils";
import { Badge, Button, Card, Modal, PageHeader, Textarea } from "@/components/ui";
import { Markdown } from "@/components/tasks";

const SUGGESTIONS = [
  "בנה לי שגרת Glow Up לשבוע הקרוב",
  "איך לבנות שגרת עור פשוטה?",
  "איזו תספורת תתאים לי?",
  "תן לי אימון כוח של 20 דקות בבית",
  "איך לשפר את השינה שלי?",
  "תסביר לי למה SPF חשוב כל כך",
  "קשה לי להתמיד — איך להתאים את התוכנית?",
];

export default function CoachPage() {
  const ai = useAIStatus();
  const messages = useStore((s) => s.coach);
  const add = useStore((s) => s.addCoachMessage);
  const update = useStore((s) => s.updateCoachMessage);
  const clear = useStore((s) => s.clearCoach);
  const profile = useStore((s) => s.profile)!;
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    setInput("");
    const userMsg = { id: uid("m"), role: "user" as const, content, ts: now() };
    add(userMsg);
    const replyId = uid("m");

    if (!ai.aiEnabled) {
      setStreaming(true);
      await new Promise((r) => setTimeout(r, 450));
      add({ id: replyId, role: "assistant", content: demoCoachReply(content, profile.name), ts: now(), demo: true });
      setStreaming(false);
      return;
    }

    add({ id: replyId, role: "assistant", content: "", ts: now() });
    setStreaming(true);
    const history = [...useStore.getState().coach.filter((m) => m.id !== replyId && !m.demo && m.content)]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      await streamCoach(history, (d) => {
        acc += d;
        update(replyId, acc);
      }, ctrl.signal);
      if (!acc.trim()) update(replyId, "_לא התקבלה תשובה. נסו שוב._");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        update(replyId, acc + "\n\n_(נעצר)_");
      } else {
        setError((e as Error).message);
        update(replyId, acc || "_שגיאה בחיבור למאמן._");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="-mb-24 flex h-[calc(100dvh-9rem)] flex-col lg:mb-0 lg:h-[calc(100dvh-4rem)]">
      <div className="mb-3 flex items-center justify-between gap-2 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <MessageCircleHeart className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">מאמן AI</h1>
            <p className="text-[11px] text-dim">{ai.aiEnabled ? "מחובר" : "מצב דמו · לא AI"}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="secondary" size="sm" className="px-3" icon={<ListPlus className="size-4" />} onClick={() => setTaskModal(true)} aria-label="צור משימות להיום">
            משימות
          </Button>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="px-3" onClick={clear} disabled={streaming} aria-label="ניקוי שיחה">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="hidden sm:block">
      <PageHeader
        title="מאמן AI אישי"
        subtitle={ai.aiEnabled ? "שואל, מסביר, מתאים את התוכנית ויוצר משימות — לפי ההתקדמות שלך." : "מצב דמו: תשובות מוכנות לפי מילות מפתח (לא AI)."}
        icon={<MessageCircleHeart className="size-5" />}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<ListPlus className="size-4" />} onClick={() => setTaskModal(true)}>
              צור משימות להיום
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={clear} disabled={streaming}>
                ניקוי שיחה
              </Button>
            )}
          </>
        }
      />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 && (
            <div className="flex min-h-full flex-col items-center justify-center py-2 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-green text-black">
                <Sparkles className="size-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">היי {profile.name}, במה נתמקד היום?</h2>
              <p className="mt-1 max-w-md text-sm text-muted">אני מכיר את המטרות, התוכנית וההתקדמות שלך. כל המלצה תגיע עם הסבר וזמן ביצוע.</p>
              <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="min-h-10 rounded-full border border-line bg-surface-2 px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-fg">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%]",
                  m.role === "user" ? "rounded-tr-sm bg-gradient-to-l from-accent-strong to-accent text-black" : "rounded-tl-sm border border-line bg-surface-2",
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                ) : m.content ? (
                  <>
                    {m.demo && <Badge tone="warn" className="mb-2">מצב דמו · לא AI</Badge>}
                    <Markdown text={m.content} />
                  </>
                ) : (
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="size-2 rounded-full bg-accent" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={endRef} />
        </div>
        {error && <div className="mx-4 mb-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="כתבו שאלה למאמן…"
            className="h-11 max-h-36 min-h-11! flex-1 py-2.5"
            rows={1}
            maxLength={2000}
          />
          {streaming && ai.aiEnabled ? (
            <Button type="button" variant="secondary" className="size-11 p-0" onClick={() => abortRef.current?.abort()} aria-label="עצירה">
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" className="size-11 p-0" disabled={!input.trim() || streaming} aria-label="שליחה">
              <Send className="size-4 -scale-x-100" />
            </Button>
          )}
        </form>
      </Card>
      <TasksModal open={taskModal} onClose={() => setTaskModal(false)} aiEnabled={ai.aiEnabled} />
    </div>
  );
}

function TasksModal({ open, onClose, aiEnabled }: { open: boolean; onClose: () => void; aiEnabled: boolean }) {
  const profile = useStore((s) => s.profile);
  const addTasks = useStore((s) => s.addCustomTasks);
  const today = useTodayTasks();
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ tasks: PlanTask[]; source: "ai" | "demo" } | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      if (aiEnabled) {
        const res = await postJSON<DailyTasksAI>("/api/tasks", { profile: profileContext(profile), context: progressContext(), request });
        setProposal({
          source: "ai",
          tasks: res.tasks.map((t) => ({ ...t, id: uid("c"), frequency: "once", startWeek: 1, custom: true, minutes: Math.round(t.minutes) })),
        });
      } else {
        const titles = new Set(today.map((t) => t.title));
        const pool = TASK_LIBRARY.filter((t) => !titles.has(t.title) && t.minutes > 0 && t.minutes <= 25);
        const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
        setProposal({
          source: "demo",
          tasks: picks.map(({ key: _k, goals: _g, priority: _p, ...t }) => ({ ...t, id: uid("c"), frequency: "once", custom: true })),
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setProposal(null);
      }}
      title="משימות חדשות להיום"
    >
      {!proposal ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {aiEnabled ? "המאמן ייצור 3 משימות קצרות לפי ההתקדמות שלך. אפשר לבקש פוקוס:" : "מצב דמו: יוצעו 3 משימות אקראיות מספריית המשימות (לא AI)."}
          </p>
          {aiEnabled && <Textarea value={request} onChange={(e) => setRequest(e.target.value)} placeholder="למשל: משהו ליציבה, יש לי רק 15 דקות" maxLength={300} />}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" loading={loading} icon={<Sparkles className="size-4" />} onClick={generate}>
            צור הצעה
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {proposal.source === "demo" && <Badge tone="warn">מצב דמו · מספריית המשימות</Badge>}
          {proposal.tasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
              <div className="font-medium">
                {t.title} <span className="text-xs text-dim">· {t.minutes} דק׳</span>
              </div>
              <div className="mt-1 text-muted">{t.how}</div>
              <div className="mt-1 text-xs text-green">{t.why}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              icon={<Check className="size-4" />}
              onClick={() => {
                addTasks(proposal.tasks, dateKey());
                setProposal(null);
                onClose();
              }}
            >
              הוסף להיום
            </Button>
            <Button variant="secondary" onClick={() => setProposal(null)}>
              הצעה אחרת
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
