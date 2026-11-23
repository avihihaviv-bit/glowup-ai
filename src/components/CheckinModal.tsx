"use client";
import { useState } from "react";
import { Droplet, Minus, Plus, Frown, Annoyed, Meh, Smile, Laugh } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Checkin } from "@/lib/types";
import { cn, dateKey } from "@/lib/utils";
import { Button, Field, Modal, Textarea } from "./ui";

const MOODS = [Frown, Annoyed, Meh, Smile, Laugh];

export function CheckinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Daily Check-in">
      {open && <CheckinForm onDone={onClose} />}
    </Modal>
  );
}

function CheckinForm({ onDone }: { onDone: () => void }) {
  const today = dateKey();
  const existing = useStore((s) => s.checkins[today]);
  const save = useStore((s) => s.saveCheckin);
  const [c, setC] = useState<Checkin>(
    existing ?? { date: today, mood: 4, energy: 3, sleepHours: 7, waterGlasses: 4, posture: 3, ateVeggies: false, note: "" },
  );
  const set = <K extends keyof Checkin>(k: K, v: Checkin[K]) => setC((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">דקה אחת ביום שעוזרת לך (ולמאמן) להבין מה עובד. הנתונים נשמרים רק אצלך.</p>
      <Field label="איך מצב הרוח?">
        <div className="flex justify-between gap-2">
          {MOODS.map((M, i) => (
            <button
              key={i}
              aria-label={`מצב רוח ${i + 1}`}
              onClick={() => set("mood", i + 1)}
              className={cn("grid size-12 place-items-center rounded-xl border transition", c.mood === i + 1 ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-dim")}
            >
              <M className="size-6" />
            </button>
          ))}
        </div>
      </Field>
      <Scale label="רמת אנרגיה" value={c.energy} onChange={(v) => set("energy", v)} />
      <Field label={`שעות שינה בלילה האחרון: ${c.sleepHours}`}>
        <input type="range" min={3} max={12} step={0.5} value={c.sleepHours} onChange={(e) => set("sleepHours", Number(e.target.value))} className="w-full" />
      </Field>
      <Field label="כוסות מים היום">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => set("waterGlasses", Math.max(0, c.waterGlasses - 1))} aria-label="פחות">
            <Minus className="size-4" />
          </Button>
          <div className="flex min-w-0 flex-1 justify-center gap-0.5 sm:gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <Droplet key={i} className={cn("size-4 shrink-0 sm:size-5", i < c.waterGlasses ? "fill-accent text-accent" : "text-surface-3")} />
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => set("waterGlasses", Math.min(15, c.waterGlasses + 1))} aria-label="יותר">
            <Plus className="size-4" />
          </Button>
        </div>
      </Field>
      <Scale label="מודעות ליציבה היום" value={c.posture} onChange={(v) => set("posture", v)} />
      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
        <input type="checkbox" checked={c.ateVeggies} onChange={(e) => set("ateVeggies", e.target.checked)} className="size-4 accent-[var(--green)]" />
        אכלתי ירקות/פירות ברוב הארוחות
      </label>
      <Field label="הערה / 3 הצלחות של היום (אופציונלי)">
        <Textarea value={c.note} onChange={(e) => set("note", e.target.value)} placeholder="למשל: הלכתי 20 דקות, שתיתי מים, הייתי בתור לספר…" maxLength={500} />
      </Field>
      <Button
        className="w-full"
        size="lg"
        onClick={() => {
          save(c);
          onDone();
        }}
      >
        {existing ? "עדכון Check-in" : "שמירת Check-in (+15 XP)"}
      </Button>
    </div>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn("h-10 flex-1 rounded-xl border text-sm transition", value === n ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-muted")}
          >
            {n}
          </button>
        ))}
      </div>
    </Field>
  );
}
