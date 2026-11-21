"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { topPriorities, type Priority } from "@/lib/priorities";
import { useLang, useT } from "@/lib/i18n";
import { Badge, Button, Card, Modal, SectionTitle } from "./ui";
import { cn } from "@/lib/utils";

function usePriorityData() {
  const profile = useStore((s) => s.profile);
  const concerns = useStore((s) => s.concerns);
  const checkins = useStore((s) => s.checkins);
  const workouts = useStore((s) => s.workouts);
  const analyses = useStore((s) => s.analyses);
  const products = useStore((s) => s.products);
  const favorites = useStore((s) => s.favorites);
  const priorityPins = useStore((s) => s.priorityPins);
  return useMemo(
    () => topPriorities({ profile, concerns, checkins, workouts, analyses, products, favorites, priorityPins }),
    [profile, concerns, checkins, workouts, analyses, products, favorites, priorityPins],
  );
}

function useTitle() {
  const t = useT();
  return (p: Priority) => (p.kind === "concern" ? (p.title ?? "") : t(`prio.${p.key}.title`));
}

export function PrioritiesCard() {
  const t = useT();
  const lang = useLang();
  const title = useTitle();
  const { top, candidates } = usePriorityData();
  const pins = useStore((s) => s.priorityPins);
  const setPins = useStore((s) => s.setPriorityPins);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const Arrow = lang === "he" ? ArrowLeft : ArrowRight;

  return (
    <Card>
      <SectionTitle
        action={
          <Button
            size="sm"
            variant="ghost"
            icon={<Pencil className="size-4" />}
            onClick={() => {
              setDraft(pins);
              setEdit(true);
            }}
          >
            {t("prio.edit")}
          </Button>
        }
      >
        <span className="tracking-wide">{t("prio.title")}</span>
      </SectionTitle>
      <div className="grid gap-3 lg:grid-cols-3">
        {top.map((p, i) => (
          <div key={p.id} className="flex flex-col rounded-2xl border border-line bg-surface-2/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
              {p.pinned && <Badge tone="accent">{t("prio.pinned")}</Badge>}
            </div>
            <h3 className="mt-2 font-semibold">{title(p)}</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-dim">{t("prio.why")}</dt>
                <dd className="text-muted">{t(p.kind === "concern" ? "prio.concern.why" : `prio.${p.key}.why`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-dim">{t("prio.do")}</dt>
                <dd className="text-muted">{t(p.kind === "concern" ? "prio.concern.do" : `prio.${p.key}.do`)}</dd>
              </div>
              <div>
                <dt className="text-xs text-dim">{t("prio.expect")}</dt>
                <dd className="text-muted">{t(p.kind === "concern" ? "prio.concern.expect" : `prio.${p.key}.expect`)}</dd>
              </div>
            </dl>
            <div className="mt-auto flex items-center justify-between pt-3">
              <span className="inline-flex items-center gap-1 text-xs text-dim">
                <Clock className="size-3" /> {t("prio.minutes", { n: p.minutes })}
              </span>
              <Link href={p.href} className="inline-flex min-h-10 items-center gap-1 text-sm text-accent">
                <Arrow className="size-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title={t("prio.editTitle")}>
        <p className="mb-3 text-sm text-muted">{t("prio.editHint")}</p>
        <div className="space-y-2">
          {candidates.map((p) => {
            const on = draft.includes(p.id);
            const disabled = !on && draft.length >= 3;
            return (
              <button
                key={p.id}
                disabled={disabled}
                aria-pressed={on}
                onClick={() => setDraft(on ? draft.filter((x) => x !== p.id) : [...draft, p.id])}
                className={cn("flex min-h-12 w-full items-center justify-between rounded-xl border p-3 text-start text-sm transition disabled:opacity-40", on ? "border-accent bg-accent-soft" : "border-line bg-surface-2")}
              >
                <span>{title(p)}</span>
                {on && <Check className="size-4 text-accent" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              setPins(draft);
              setEdit(false);
            }}
          >
            {t("common.save")}
          </Button>
          <Button variant="secondary" onClick={() => (setPins([]), setEdit(false))}>
            {t("prio.auto")}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
