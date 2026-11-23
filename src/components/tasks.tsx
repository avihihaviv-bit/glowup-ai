"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Clock, Trash2 } from "lucide-react";
import type { PlanTask } from "@/lib/types";
import { CATEGORY_META, cn, dateKey } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { importanceOf } from "@/lib/plan";

export function TaskItem({ task, date = dateKey(), compact }: { task: PlanTask; date?: string; compact?: boolean }) {
  const done = useStore((s) => (s.completions[date] ?? []).includes(task.id));
  const toggle = useStore((s) => s.toggleTask);
  const removeCustom = useStore((s) => s.removeCustomTask);
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[task.category];
  return (
    <motion.div layout className={cn("rounded-2xl border bg-white transition", done ? "border-green/30" : "border-line")}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => toggle(task.id, date)}
          aria-label={done ? "סמן כלא בוצע" : "סמן כבוצע"}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg border-2 transition",
            done ? "border-green bg-green text-white" : "border-line-strong hover:border-accent",
          )}
        >
          <AnimatePresence>
            {done && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button className="min-w-0 flex-1 text-right" onClick={() => setOpen((o) => !o)}>
          <div className={cn("truncate text-sm font-medium", done && "text-muted line-through")}>{task.title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-dim">
            <span className="inline-flex items-center gap-1" style={{ color: meta?.color }}>
              <span className="size-1.5 rounded-full" style={{ background: meta?.color }} /> {meta?.label}
            </span>
            {task.minutes > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="size-3" />
                {task.minutes} דק׳
              </span>
            )}
            {task.custom && <span className="text-accent">• מהמאמן</span>}
            {!compact && (
              <span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", { high: "bg-accent-soft text-accent-strong", medium: "bg-surface-3 text-muted", low: "bg-surface-2 text-dim" }[importanceOf(task)])}>
                {{ high: "חשוב", medium: "בינוני", low: "רשות" }[importanceOf(task)]}
              </span>
            )}
          </div>
        </button>
        {!compact && (
          <button onClick={() => setOpen((o) => !o)} className="text-dim hover:text-fg" aria-label="פרטים">
            <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 border-t border-line px-3 py-3 text-sm">
              <p>
                <span className="font-medium text-accent">איך: </span>
                <span className="text-muted">{task.how}</span>
              </p>
              <p>
                <span className="font-medium text-green">למה: </span>
                <span className="text-muted">{task.why}</span>
              </p>
              {task.custom && (
                <button onClick={() => removeCustom(task.id, date)} className="inline-flex items-center gap-1 text-xs text-danger">
                  <Trash2 className="size-3" /> הסרת משימה
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Tiny, safe markdown renderer (bold, italics, lists, paragraphs). No HTML injection. */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(h ? <p key={blocks.length}><strong>{inline(h[1])}</strong></p> : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="prose-coach text-sm leading-relaxed">{blocks}</div>;
}

function inline(s: string): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if ((p.startsWith("_") && p.endsWith("_") && p.length > 2) || (p.startsWith("*") && p.endsWith("*") && p.length > 2))
      return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}
