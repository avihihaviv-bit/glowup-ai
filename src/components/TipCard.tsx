"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, EyeOff, Eye, ListPlus, Share2, MessageCircleHeart, Clock, ExternalLink, AlertTriangle } from "lucide-react";
import type { Tip } from "@/data/tips";
import { EVIDENCE_LABEL, TIP_CATEGORY } from "@/data/tips";
import { SOURCES } from "@/data/sources";
import { useStore } from "@/lib/store";
import { cn, dateKey, uid } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { Badge } from "./ui";

const TO_TASK_CAT: Record<string, Category> = {
  face: "skin", skin: "skin", puffiness: "skin", hairCare: "hair", hairStyling: "hair", oral: "mindset", body: "mindset",
  fragrance: "style", sleep: "sleep", nutrition: "nutrition", posture: "posture", style: "style", grooming: "style",
};

export function TipCard({ tip }: { tip: Tip }) {
  const router = useRouter();
  const today = dateKey();
  const fav = useStore((s) => s.tipFavorites.includes(tip.id));
  const hidden = useStore((s) => s.tipHidden.includes(tip.id));
  const doneToday = useStore((s) => (s.tipDone[tip.id] ?? []).includes(today));
  const timesDone = useStore((s) => (s.tipDone[tip.id] ?? []).length);
  const toggleFav = useStore((s) => s.toggleTipFavorite);
  const toggleHidden = useStore((s) => s.toggleTipHidden);
  const toggleDone = useStore((s) => s.toggleTipDone);
  const addTasks = useStore((s) => s.addCustomTasks);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);
  const src = tip.source ? SOURCES[tip.source] : null;

  async function share() {
    const text = `${tip.title}\n${tip.description}${src ? `\n${src.url}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: tip.title, text });
      else await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* cancelled */
    }
  }

  const act = "grid size-10 place-items-center rounded-xl text-dim transition hover:bg-surface-2 hover:text-fg";
  return (
    <article className={cn("flex flex-col rounded-2xl border bg-white p-4 shadow-card", doneToday ? "border-green/40" : "border-line", hidden && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{TIP_CATEGORY[tip.category] ?? tip.category}</Badge>
        <Badge>{EVIDENCE_LABEL[tip.evidence]}</Badge>
        {tip.importance === "high" && <Badge tone="green">חשוב</Badge>}
      </div>
      <h3 className="mt-2 font-semibold leading-snug">{tip.title}</h3>
      <p className="mt-1 text-sm text-muted">{tip.description}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-dim">
        {tip.minutes > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {tip.minutes} דק׳
          </span>
        )}
        {tip.when && <span>{tip.when}</span>}
        <span>{{ easy: "קל", medium: "בינוני", hard: "מאתגר" }[tip.difficulty]}</span>
        {tip.products.length > 0 && <span>צריך: {tip.products.join(", ")}</span>}
        {tip.suitability && <span>מתאים ל: {tip.suitability}</span>}
        {timesDone > 0 && <span className="text-green">בוצע {timesDone} פעמים</span>}
      </div>
      {tip.warning && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {tip.warning}
        </p>
      )}
      {src && (
        <a href={src.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="mt-2 inline-flex w-fit items-center gap-1 text-[11px] text-accent hover:underline">
          {src.org} · {src.title} <ExternalLink className="size-3" />
        </a>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-0.5 border-t border-line pt-2">
        <button onClick={() => toggleDone(tip.id)} aria-pressed={doneToday} aria-label={doneToday ? "בטל סימון ביצוע" : "סמן כבוצע היום"} className={cn(act, doneToday && "bg-green-soft text-green")}>
          <Check className="size-4" />
        </button>
        <button onClick={() => toggleFav(tip.id)} aria-pressed={fav} aria-label={fav ? "הסר ממועדפים" : "הוסף למועדפים"} className={cn(act, fav && "text-accent")}>
          <Heart className={cn("size-4", fav && "fill-accent")} />
        </button>
        <button
          onClick={() => {
            addTasks([{ id: uid("c"), title: tip.title, how: tip.description, why: EVIDENCE_LABEL[tip.evidence], minutes: tip.minutes, category: TO_TASK_CAT[tip.category] ?? "style", frequency: "once", startWeek: 1, custom: true }], today);
            setAdded(true);
          }}
          disabled={added}
          aria-label="הוסף למשימות היום"
          className={cn(act, added && "text-green")}
        >
          <ListPlus className="size-4" />
        </button>
        <button onClick={share} aria-label="שיתוף" className={cn(act, shared && "text-green")}>
          <Share2 className="size-4" />
        </button>
        <button onClick={() => router.push(`/coach?q=${encodeURIComponent(`ספר לי עוד על הטיפ: "${tip.title}". איך ליישם אותו אצלי?`)}`)} aria-label="שאלו את ה-AI על הטיפ" className={act}>
          <MessageCircleHeart className="size-4" />
        </button>
        <button onClick={() => toggleHidden(tip.id)} aria-label={hidden ? "הצג שוב" : "הסתר"} className={cn(act, "ms-auto")}>
          {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>
    </article>
  );
}
