"use client";
import { useState } from "react";
import type { ConcernCategory } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Button, Chip, Field, Input, Textarea } from "./ui";
import { ImageUploader } from "./ImageUploader";

export const CONCERN_CATEGORIES: ConcernCategory[] = ["skin", "hair", "face", "body", "posture", "fitness", "nutrition", "bloating", "sleep", "growth", "style", "other"];

export interface ConcernDraft {
  title: string;
  description: string;
  category: ConcernCategory;
  photo: Blob | null;
  consent: boolean;
}

export function ConcernForm({
  onSubmit,
  submitLabel,
  secondary,
  compact,
  busy,
}: {
  onSubmit: (d: ConcernDraft, mode: "analyze" | "save") => void;
  submitLabel?: string;
  secondary?: boolean;
  compact?: boolean;
  busy?: boolean;
}) {
  const t = useT();
  const [d, setD] = useState<ConcernDraft>({ title: "", description: "", category: "skin", photo: null, consent: false });
  const set = <K extends keyof ConcernDraft>(k: K, v: ConcernDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const valid = d.title.trim().length > 0 && (!d.photo || d.consent);

  function submit(mode: "analyze" | "save") {
    if (!valid) return;
    onSubmit({ ...d, title: d.title.trim(), description: d.description.trim(), photo: d.consent ? d.photo : null }, mode);
    setD({ title: "", description: "", category: d.category, photo: null, consent: false });
  }

  return (
    <div className="space-y-4">
      <Field label={t("concerns.form.title")}>
        <Input id="concern-title" value={d.title} onChange={(e) => set("title", e.target.value)} placeholder={t("concerns.form.titlePh")} maxLength={120} />
      </Field>
      <Field label={t("concerns.form.desc")}>
        <Textarea id="concern-desc" value={d.description} onChange={(e) => set("description", e.target.value)} className={compact ? "min-h-20!" : "min-h-28!"} maxLength={2000} />
      </Field>
      <Field label={t("concerns.form.category")}>
        <div className="flex flex-wrap gap-2">
          {CONCERN_CATEGORIES.map((c) => (
            <Chip key={c} active={d.category === c} onClick={() => set("category", c)}>
              {t(`cat.${c}`)}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label={`${t("concerns.form.photo")}`}>
        <div className="max-w-44">
          <ImageUploader value={d.photo} onChange={(b) => set("photo", b)} hint={t("concerns.form.photoNote")} aspect="aspect-square" />
        </div>
      </Field>
      {d.photo && (
        <label className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={d.consent} onChange={(e) => set("consent", e.target.checked)} />
          {t("concerns.form.consent")}
        </label>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={!valid} loading={busy} onClick={() => submit("analyze")}>
          {submitLabel ?? t("concerns.form.analyze")}
        </Button>
        {secondary && (
          <Button variant="secondary" disabled={!valid || busy} onClick={() => submit("save")}>
            {t("concerns.form.saveOnly")}
          </Button>
        )}
      </div>
    </div>
  );
}
