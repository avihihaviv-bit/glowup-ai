"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ExternalLink, HeartHandshake, ListPlus, Plus, RefreshCw, Send, Stethoscope, Trash2, Square } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAIStatus, streamCoach } from "@/lib/api";
import { useLang, useT } from "@/lib/i18n";
import type { Concern, ConcernStatus } from "@/lib/types";
import type { ConcernAnalysisAI } from "@/lib/schemas";
import { saveImage } from "@/lib/images";
import { analyzeConcernById, newConcern } from "@/lib/concernActions";
import { cn, dateKey, heDate, uid, now } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, ErrorBox, Modal, PageHeader, SectionTitle, Select, Spinner, Textarea } from "@/components/ui";
import { ConcernForm, type ConcernDraft } from "@/components/ConcernForm";
import { StoredImage } from "@/components/StoredImage";
import { Markdown } from "@/components/tasks";
import { TrendArea } from "@/components/charts";

const STATUSES: ConcernStatus[] = ["new", "inProgress", "improving", "completed"];
const statusTone = { new: "default", inProgress: "accent", improving: "green", completed: "green" } as const;

export default function ConcernsPage() {
  const t = useT();
  const concerns = useStore((s) => s.concerns);
  const addConcern = useStore((s) => s.addConcern);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // deep link from the priorities card: /concerns?open=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("open");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setOpenId(id);
  }, []);

  async function runAnalysis(id: string, sendImage: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await analyzeConcernById(id, { sendImage });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function create(d: ConcernDraft, mode: "analyze" | "save") {
    const imageId = d.photo ? await saveImage(d.photo) : undefined;
    const id = uid("cn");
    addConcern(newConcern({ title: d.title, description: d.description, category: d.category, imageId }, id));
    setAdding(false);
    setOpenId(id);
    if (mode === "analyze") await runAnalysis(id, !!imageId);
  }

  const open = concerns.find((c) => c.id === openId) ?? null;
  if (open) return <Detail concern={open} busy={busyId === open.id} error={error} onBack={() => setOpenId(null)} onAnalyze={() => runAnalysis(open.id, !!open.imageId)} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("concerns.title")}
        subtitle={t("concerns.sub")}
        icon={<HeartHandshake className="size-5" />}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            {t("concerns.add")}
          </Button>
        }
      />
      {concerns.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="size-5" />}
          title={t("concerns.empty.title")}
          text={t("concerns.empty.text")}
          action={<Button onClick={() => setAdding(true)}>{t("concerns.add")}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {concerns.map((c) => (
            <Card key={c.id} interactive className="p-0">
              <button className="flex w-full items-start gap-3 p-4 text-start" onClick={() => setOpenId(c.id)}>
                {c.imageId ? <StoredImage imageId={c.imageId} alt="" className="size-14 shrink-0 rounded-xl" /> : <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent-soft text-xl">💬</div>}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.title}</div>
                  {c.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{c.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge>{t(`cat.${c.category}`)}</Badge>
                    <Badge tone={statusTone[c.status]}>{t(`concerns.status.${c.status}`)}</Badge>
                    {c.analysis ? <Badge tone={c.analysis.source === "ai" ? "accent" : "warn"}>{c.analysis.source === "ai" ? "AI" : t("common.demo")}</Badge> : null}
                  </div>
                </div>
              </button>
              {!c.analysis && (
                <div className="border-t border-line p-3">
                  <Button size="sm" variant="secondary" loading={busyId === c.id} onClick={() => runAnalysis(c.id, !!c.imageId)}>
                    {t("concerns.analyze")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {error && <ErrorBox message={error} />}
      <Modal open={adding} onClose={() => setAdding(false)} title={t("concerns.add")} wide>
        {adding && <ConcernForm secondary onSubmit={create} />}
      </Modal>
    </div>
  );
}

function List({ items, icon = "•" }: { items: string[]; icon?: string }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-accent">{icon}</span>
          <span className="text-muted">{x}</span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ concern, busy, error, onBack, onAnalyze }: { concern: Concern; busy: boolean; error: string | null; onBack: () => void; onAnalyze: () => void }) {
  const t = useT();
  const lang = useLang();
  const ai = useAIStatus();
  const setStatus = useStore((s) => s.setConcernStatus);
  const remove = useStore((s) => s.removeConcern);
  const addTasks = useStore((s) => s.addCustomTasks);
  const [tasksAdded, setTasksAdded] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const a = concern.analysis?.data as ConcernAnalysisAI | undefined;
  const Back = lang === "he" ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" icon={<Back className="size-4" />} onClick={onBack}>
        {t("concerns.back")}
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{concern.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{t(`cat.${concern.category}`)}</Badge>
            {concern.analysis && <Badge tone={concern.analysis.source === "ai" ? "accent" : "warn"}>{concern.analysis.source === "ai" ? "AI" : t("common.demo")}</Badge>}
          </div>
          {concern.description && <p className="mt-3 max-w-2xl text-sm text-muted">{concern.description}</p>}
        </div>
        <Select value={concern.status} onChange={(e) => setStatus(concern.id, e.target.value as ConcernStatus)} className="sm:w-44" aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`concerns.status.${s}`)}
            </option>
          ))}
        </Select>
      </div>
      {concern.imageId && <StoredImage imageId={concern.imageId} alt="" className="h-40 w-32 rounded-2xl" />}
      {error && <ErrorBox message={error} onRetry={onAnalyze} />}

      {busy ? (
        <Spinner label={t("concerns.analyzing")} />
      ) : !a ? (
        <Card className="text-center">
          <Button onClick={onAnalyze} icon={<RefreshCw className="size-4" />}>
            {t("concerns.reanalyze")}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {concern.analysis?.source === "demo" && <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">{t("concerns.demoNotice")}</div>}
          {a.supportiveNote && <p className="rounded-xl bg-accent-soft p-3 text-sm">{a.supportiveNote}</p>}
          <Card>
            <SectionTitle action={<Badge tone="accent">{t(`concerns.kind.${a.kind}`)}</Badge>}>{t("concerns.s.understand")}</SectionTitle>
            <p className="text-sm text-muted">{a.understanding}</p>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {a.known.length > 0 && (
              <Card>
                <SectionTitle>{t("concerns.s.known")}</SectionTitle>
                <List items={a.known} icon="✓" />
              </Card>
            )}
            <Card>
              <SectionTitle>{t("concerns.s.unknown")}</SectionTitle>
              <List items={a.unknown} icon="?" />
            </Card>
          </div>
          {a.possibleExplanations.length > 0 && (
            <Card>
              <SectionTitle>{t("concerns.s.explanations")}</SectionTitle>
              <List items={a.possibleExplanations} />
            </Card>
          )}
          <Card>
            <SectionTitle>{t("concerns.s.outlook")}</SectionTitle>
            <p className="text-sm text-muted">{a.realisticOutlook}</p>
          </Card>
          <Card>
            <SectionTitle>{t("concerns.s.steps")}</SectionTitle>
            <ol className="space-y-3">
              {a.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                  <div>
                    <div className="font-medium">
                      {s.title} {s.minutes > 0 && <span className="text-xs text-dim">· {s.minutes} {t("common.min")}</span>}
                    </div>
                    <div className="text-muted">{s.how}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          {a.products.length > 0 && (
            <Card>
              <SectionTitle>{t("concerns.s.products")}</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2">
                {a.products.map((p, i) => (
                  <div key={i} className="rounded-xl bg-surface-2 p-3 text-sm">
                    <div className="font-medium">{p.type}</div>
                    <div className="text-muted">{p.why}</div>
                    <div className="mt-1 text-xs text-green">💰 {p.budgetTip}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {a.videoQueries.length > 0 && (
            <Card>
              <SectionTitle>{t("concerns.s.videos")}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {a.videoQueries.map((q) => (
                  <a key={q} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-sm text-muted hover:text-fg">
                    {q} <ExternalLink className="size-3.5" />
                  </a>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <SectionTitle
              action={
                <Button
                  size="sm"
                  variant={tasksAdded ? "green" : "secondary"}
                  disabled={tasksAdded}
                  icon={tasksAdded ? <Check className="size-4" /> : <ListPlus className="size-4" />}
                  onClick={() => {
                    addTasks(
                      a.dailyTasks.map((d) => ({
                        id: uid("c"),
                        title: d.title,
                        how: d.how,
                        why: concern.title,
                        minutes: Math.round(d.minutes),
                        category: "mindset",
                        frequency: "once",
                        startWeek: 1,
                        custom: true,
                      })),
                      dateKey(),
                    );
                    setTasksAdded(true);
                  }}
                >
                  {tasksAdded ? t("concerns.tasksAdded") : t("concerns.addTasks")}
                </Button>
              }
            >
              {t("concerns.s.tasks")}
            </SectionTitle>
            <List items={a.dailyTasks.map((d) => `${d.title}: ${d.how}${d.minutes ? ` (${d.minutes} ${t("common.min")})` : ""}`)} icon="☑" />
          </Card>
          {a.trackingMetrics.length > 0 && (
            <Card>
              <SectionTitle>{t("concerns.s.tracking")}</SectionTitle>
              <List items={a.trackingMetrics} />
            </Card>
          )}
          {a.seeProfessional && (
            <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", a.seeProfessional.recommended ? "border-warn/30 bg-warn/10" : "border-line bg-surface-2")}>
              <Stethoscope className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <div className="font-medium">{t("concerns.s.professional")}</div>
                <p className="mt-0.5 text-muted">{a.seeProfessional.when}</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" icon={<RefreshCw className="size-4" />} onClick={onAnalyze}>
            {t("concerns.reanalyze")}
          </Button>
        </div>
      )}

      <ProgressLog concern={concern} />
      <FollowUp concern={concern} aiEnabled={ai.aiEnabled} />

      <div className="pt-2">
        {confirmDel ? (
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                remove(concern.id);
                onBack();
              }}
            >
              {t("common.delete")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDel(true)}>
            {t("concerns.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressLog({ concern }: { concern: Concern }) {
  const t = useT();
  const add = useStore((s) => s.addConcernProgress);
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(3);
  const data = useMemo(() => concern.progress.map((p) => ({ label: heDate(p.date), value: p.rating })), [concern.progress]);
  return (
    <Card>
      <SectionTitle>{t("concerns.progress")}</SectionTitle>
      {data.length > 1 && <TrendArea data={data} color="var(--green)" />}
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-sm font-medium">{t("concerns.progress.rating")}</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-pressed={rating === n} className={cn("h-11 flex-1 rounded-xl border text-sm", rating === n ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-muted")}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <Textarea id="concern-progress-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("concerns.progress.note")} maxLength={300} className="min-h-16!" />
        <Button
          variant="secondary"
          onClick={() => {
            add(concern.id, { date: dateKey(), note: note.trim(), rating });
            setNote("");
          }}
        >
          {t("concerns.progress.add")}
        </Button>
      </div>
      {concern.progress.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
          {[...concern.progress].reverse().map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-dim">{heDate(p.date)}</span>
              <span className="text-warn">{"★".repeat(p.rating)}</span>
              <span className="min-w-0 text-muted">{p.note}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FollowUp({ concern, aiEnabled }: { concern: Concern; aiEnabled: boolean }) {
  const t = useT();
  const add = useStore((s) => s.addConcernMessage);
  const update = useStore((s) => s.updateConcernMessage);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function send() {
    const content = input.trim();
    if (!content || streaming || !aiEnabled) return;
    setInput("");
    setErr(null);
    add(concern.id, { id: uid("m"), role: "user", content, ts: now() });
    const replyId = uid("m");
    add(concern.id, { id: replyId, role: "assistant", content: "", ts: now() });
    const history = [...(useStore.getState().concerns.find((c) => c.id === concern.id)?.thread ?? [])]
      .filter((m) => m.id !== replyId && m.content)
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content }));
    const a = concern.analysis?.data as ConcernAnalysisAI | undefined;
    const focus = `כותרת: ${concern.title}\nקטגוריה: ${concern.category}\nתיאור: ${concern.description}\n${a ? `סיכום ניתוח קודם: ${a.understanding}` : ""}`;
    const ctrl = new AbortController();
    abort.current = ctrl;
    setStreaming(true);
    let acc = "";
    try {
      await streamCoach(history, (d) => (acc += d, update(concern.id, replyId, acc)), ctrl.signal, focus);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <Card>
      <SectionTitle>{t("concerns.ask")}</SectionTitle>
      {!aiEnabled && <p className="mb-3 text-sm text-warn">{t("concerns.followUpDemo")}</p>}
      {concern.thread.length > 0 && (
        <div className="mb-3 space-y-3">
          {concern.thread.map((m) => (
            <div key={m.id} className={cn("rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "bg-accent-soft" : "border border-line bg-surface-2")}>
              {m.role === "user" ? m.content : m.content ? <Markdown text={m.content} /> : <Spinner />}
            </div>
          ))}
        </div>
      )}
      {err && <p className="mb-2 text-sm text-danger">{err}</p>}
      <div className="flex items-end gap-2">
        <Textarea
          id="concern-followup"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t("concerns.askPh")}
          disabled={!aiEnabled}
          className="h-11 min-h-11! flex-1 py-2.5"
          maxLength={1500}
        />
        {streaming ? (
          <Button type="button" variant="secondary" className="size-11 p-0" onClick={() => abort.current?.abort()} aria-label="Stop">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="button" className="size-11 p-0" disabled={!input.trim() || !aiEnabled} onClick={send} aria-label="Send">
            <Send className="size-4 rtl:-scale-x-100" />
          </Button>
        )}
      </div>
    </Card>
  );
}
