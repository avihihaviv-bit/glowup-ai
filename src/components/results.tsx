"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Camera, Check, Copy, Glasses, History, Lightbulb, ListChecks, Scissors, Sparkles, Trash2, X, AlertTriangle, Plus } from "lucide-react";
import type { FaceAnalysis, HairAnalysis, SkinRoutine, StyleAnalysis } from "@/lib/schemas";
import type { AnalysisRecord, AnalysisType } from "@/lib/types";
import { FACE_SHAPE_INFO, type FaceShape } from "@/lib/knowledge";
import { useStore } from "@/lib/store";
import { cn, heDate, uid, dateKey } from "@/lib/utils";
import { Badge, Button, Card, SectionTitle, SourceNotice } from "./ui";
import { StoredImage } from "./StoredImage";

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function List({ items, icon = "•" }: { items: string[]; icon?: string }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-accent">{icon}</span>
          <span className="text-muted">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      icon={ok ? <Check className="size-4 text-green" /> : <Copy className="size-4" />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {ok ? "הועתק" : "העתקה"}
    </Button>
  );
}

export function PhotoFeedbackCard({ photo }: { photo: FaceAnalysis["photo"] }) {
  return (
    <Card className={cn(!photo.usable && "border-warn/40")}>
      <SectionTitle action={photo.usable ? <Badge tone="green">תמונה תקינה</Badge> : <Badge tone="warn">כדאי לצלם שוב</Badge>}>
        <span className="flex items-center gap-2">
          <Camera className="size-4 text-accent" /> איכות התמונה
        </span>
      </SectionTitle>
      {!photo.usable && photo.issue && (
        <p className="mb-3 flex items-center gap-2 text-sm text-warn">
          <AlertTriangle className="size-4" /> {photo.issue}
        </p>
      )}
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        {[
          ["תאורה", photo.lighting],
          ["זווית", photo.angle],
          ["חדות", photo.clarity],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-dim">{k}</div>
            <div className="mt-0.5">{v}</div>
          </div>
        ))}
      </div>
      {photo.tips.length > 0 && (
        <div className="mt-3">
          <List items={photo.tips} icon="•" />
        </div>
      )}
    </Card>
  );
}

function AddToTodayButton({ items }: { items: { title: string; how: string; minutes: number }[] }) {
  const add = useStore((s) => s.addCustomTasks);
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant={done ? "green" : "secondary"}
      icon={done ? <Check className="size-4" /> : <Plus className="size-4" />}
      disabled={done}
      onClick={() => {
        add(
          items.map((i) => ({
            id: uid("c"),
            title: i.title,
            how: i.how,
            why: "מתוך תוכנית הפעולה של הניתוח",
            minutes: i.minutes,
            category: "style",
            frequency: "once",
            startWeek: 1,
            custom: true,
          })),
          dateKey(),
        );
        setDone(true);
      }}
    >
      {done ? "נוסף להיום" : "הוסף למשימות היום"}
    </Button>
  );
}

function Suggestions({ items, title }: { items: { name: string; why: string; howToAsk: string }[]; title: string }) {
  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Scissors className="size-4 text-accent" /> {title}
        </span>
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((h, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="font-medium">{h.name}</div>
            <p className="mt-1 text-sm text-muted">{h.why}</p>
            <div className="mt-3 rounded-lg bg-surface-3/60 p-2.5 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-accent">מה לבקש מהספר:</span>
                <CopyButton text={h.howToAsk} />
              </div>
              <span className="text-muted">{h.howToAsk}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FaceResult({ r, source }: { r: FaceAnalysis; source: "ai" | "demo" }) {
  const info = FACE_SHAPE_INFO[r.faceShape.shape as FaceShape];
  return (
    <motion.div {...fade} className="space-y-4">
      <SourceNotice source={source} />
      <PhotoFeedbackCard photo={r.photo} />
      <Card>
        <SectionTitle action={<Badge tone="default">ביטחון: {{ low: "נמוך", medium: "בינוני", high: "גבוה" }[r.faceShape.confidence]}</Badge>}>
          מבנה פנים כללי
        </SectionTitle>
        <div className="text-2xl font-bold text-gradient">{info?.label ?? r.faceShape.shape}</div>
        <p className="mt-2 text-sm text-muted">{r.faceShape.explanation}</p>
        <p className="mt-2 text-xs text-dim">הערכה גסה לצורך התאמת סטייל בלבד. אין כאן דירוג או ציון.</p>
      </Card>
      <Suggestions items={r.hairstyles} title="תסרוקות מתאימות" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>גבות</SectionTitle>
          <List items={r.eyebrows} />
        </Card>
        <Card>
          <SectionTitle>טיפוח</SectionTitle>
          <List items={r.grooming} />
        </Card>
        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Glasses className="size-4 text-accent" /> משקפיים {r.glasses.relevant ? "" : "(אם תרצה/י)"}
            </span>
          </SectionTitle>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {r.glasses.recommendedFrames.map((f) => (
              <Badge key={f} tone="green">
                {f}
              </Badge>
            ))}
          </div>
          {r.glasses.avoid.length > 0 && <p className="text-xs text-muted">פחות מומלץ: {r.glasses.avoid.join(", ")}</p>}
        </Card>
        <Card>
          <SectionTitle>סטייל</SectionTitle>
          <List items={r.style} />
        </Card>
      </div>
      <ActionPlan items={r.actionPlan} />
    </motion.div>
  );
}

function ActionPlan({ items }: { items: { title: string; how: string; minutes: number }[] }) {
  if (!items.length) return null;
  return (
    <Card>
      <SectionTitle action={<AddToTodayButton items={items} />}>
        <span className="flex items-center gap-2">
          <ListChecks className="size-4 text-green" /> תוכנית פעולה
        </span>
      </SectionTitle>
      <ol className="space-y-3">
        {items.map((a, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-soft text-sm font-semibold text-green">{i + 1}</span>
            <div className="text-sm">
              <div className="font-medium">
                {a.title} <span className="text-xs text-dim">· {a.minutes} דק׳</span>
              </div>
              <div className="text-muted">{a.how}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function HairResult({ r, source }: { r: HairAnalysis; source: "ai" | "demo" }) {
  return (
    <motion.div {...fade} className="space-y-4">
      <SourceNotice source={source} />
      <PhotoFeedbackCard photo={r.photo} />
      <Card>
        <SectionTitle>השיער שלך</SectionTitle>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          {[
            ["אורך", r.length],
            ["מרקם", r.texture],
            ["תספורת נוכחית", r.currentCut],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3">
              <div className="text-xs text-dim">{k}</div>
              <div className="mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </Card>
      <Suggestions items={r.recommendedStyles} title="תספורות מומלצות" />
      {r.barberScript && (
        <Card className="border-accent/30 bg-accent-soft">
          <SectionTitle action={<CopyButton text={r.barberScript} />}>מה להגיד לספר</SectionTitle>
          <p className="text-sm leading-relaxed">{r.barberScript}</p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>שגרת טיפוח</SectionTitle>
          <div className="space-y-3">
            {r.routine.map((s, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">
                  {s.step} <span className="text-xs text-accent">· {s.frequency}</span>
                </div>
                <div className="text-muted">{s.how}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>מוצרים אפשריים</SectionTitle>
          <div className="space-y-3">
            {r.products.map((p, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{p.type}</div>
                <div className="text-muted">{p.why}</div>
                <div className="text-xs text-accent-strong"> {p.budgetTip}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

export function StyleResult({ r, source }: { r: StyleAnalysis; source: "ai" | "demo" }) {
  const score = Math.max(1, Math.min(10, Math.round(r.itemMatch.score)));
  return (
    <motion.div {...fade} className="space-y-4">
      <SourceNotice source={source} />
      <PhotoFeedbackCard photo={r.photo} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col items-center justify-center text-center">
          <div className="text-xs text-muted">התאמת פריטים</div>
          <div className="mt-2 text-5xl font-bold text-gradient">{score}/10</div>
          <p className="mt-2 text-xs text-dim">מדרג את ההתאמה בין הבגדים בלבד — לא את האדם.</p>
        </Card>
        <Card className="md:col-span-2">
          <SectionTitle>פריטים שזוהו</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {r.items.map((it, i) => (
              <Badge key={i}>
                {it.item} · {it.color}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{r.itemMatch.explanation}</p>
        </Card>
      </div>
      <Card>
        <SectionTitle>התאמת צבעים</SectionTitle>
        <p className="mb-3 text-sm text-muted">{r.colorHarmony.summary}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium text-green">מה עובד</div>
            <List items={r.colorHarmony.works} icon="✓" />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-warn">מה אפשר לשפר</div>
            <List items={r.colorHarmony.improve} icon="→" />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionTitle>נעליים</SectionTitle>
          <p className="text-sm text-muted">{r.shoes}</p>
        </Card>
        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Lightbulb className="size-4 text-warn" /> רעיונות לשדרוג
            </span>
          </SectionTitle>
          <List items={r.upgrades} />
        </Card>
      </div>
      <Card>
        <SectionTitle>פריטים חדשים שכדאי לשקול</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {r.newPieces.map((p, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-2/60 p-3 text-sm">
              <div className="font-medium">{p.item}</div>
              <div className="mt-1 text-muted">{p.why}</div>
              <div className="mt-2 text-xs text-green">{p.priceRange}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> Style Inspiration
          </span>
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {r.inspiration.map((p, i) => (
            <a
              key={i}
              href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(p.name + " outfit")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gradient-to-br from-accent-soft to-white p-4 text-sm transition hover:brightness-110"
            >
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 text-muted">{p.description}</div>
              <div className="mt-2 text-xs text-accent">חיפוש השראה ↗</div>
            </a>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export function SkinResult({ r, source }: { r: SkinRoutine; source: "ai" | "demo" }) {
  const block = (title: string, items: SkinRoutine["morning"]) =>
    items.length > 0 && (
      <Card>
        <SectionTitle action={<span className="text-xs text-muted">~{items.reduce((a, b) => a + b.minutes, 0)} דק׳</span>}>{title}</SectionTitle>
        <ol className="space-y-3">
          {items.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
              <div className="text-sm">
                <div className="font-medium">
                  {s.step}: <span className="text-accent">{s.product}</span>
                </div>
                <div className="text-muted">{s.how}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    );
  return (
    <motion.div {...fade} className="space-y-4">
      <SourceNotice source={source} />
      <Card>
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {block("שגרת בוקר", r.morning)}
        {block("שגרת ערב", r.evening)}
      </div>
      {block("פעם בשבוע (אופציונלי)", r.weekly)}
      {r.productNotes.length > 0 && (
        <Card>
          <SectionTitle>המוצרים שלך</SectionTitle>
          <div className="space-y-2">
            {r.productNotes.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                <Badge tone={p.verdict === "keep" ? "green" : p.verdict === "replace" ? "warn" : "default"}>
                  {{ keep: "להשאיר", optional: "אופציונלי", replace: "להחליף", unknown: "לבדוק" }[p.verdict]}
                </Badge>
                <div>
                  <div className="font-medium">{p.product}</div>
                  <div className="text-muted">{p.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <SectionTitle>טיפים</SectionTitle>
        <List items={r.tips} icon="•" />
      </Card>
      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
        <span></span>
        <span>{r.dermatologistNote}</span>
      </div>
    </motion.div>
  );
}

export function AnalysisHistory({ type, onOpen }: { type: AnalysisType; onOpen: (r: AnalysisRecord) => void }) {
  const all = useStore((s) => s.analyses);
  const items = useMemo(() => all.filter((a) => a.type === type), [all, type]);
  const remove = useStore((s) => s.removeAnalysis);
  if (!items.length) return null;
  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <History className="size-4 text-muted" /> ניתוחים קודמים
        </span>
      </SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-2">
            <button onClick={() => onOpen(a)} className="flex min-w-0 flex-1 items-center gap-3 text-right">
              {a.imageId ? (
                <StoredImage imageId={a.imageId} alt="" className="size-12 rounded-lg" />
              ) : (
                <div className="grid size-12 place-items-center rounded-lg bg-surface-3 text-lg"></div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium">{heDate(a.date)}</div>
                <Badge tone={a.source === "ai" ? "accent" : "warn"}>{a.source === "ai" ? "AI" : "דמו"}</Badge>
              </div>
            </button>
            <button onClick={() => remove(a.id)} className="grid size-8 place-items-center rounded-lg text-dim hover:bg-danger/10 hover:text-danger" aria-label="מחיקה">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CloseResult({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={onClick}>
      ניתוח חדש
    </Button>
  );
}
