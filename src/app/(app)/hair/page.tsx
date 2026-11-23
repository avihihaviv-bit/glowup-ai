"use client";
import { useMemo, useState } from "react";
import { Heart, Scissors, Sparkles, Star, Trash2, Plus, ExternalLink } from "lucide-react";
import { useAIStatus } from "@/lib/api";
import { useAnalysis } from "@/lib/useAnalysis";
import { useStore } from "@/lib/store";
import { audienceFor, demoHair, matchHairstyles } from "@/lib/demo";
import { FACE_SHAPE_INFO, type FaceShape, type Hairstyle } from "@/lib/knowledge";
import type { HairAnalysis } from "@/lib/schemas";
import { saveImage } from "@/lib/images";
import { cn, dateKey, heDate, uid } from "@/lib/utils";
import { Badge, Button, Card, Chip, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, SectionTitle, Segmented, Spinner, Textarea } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";
import { AnalysisHistory, CloseResult, CopyButton, HairResult } from "@/components/results";
import { PhotoRatings } from "@/components/PhotoRatings";
import { HairIllustration } from "@/components/HairIllustration";
import { StoredImage } from "@/components/StoredImage";

type Tab = "analysis" | "gallery" | "tried";

export default function HairPage() {
  const [tab, setTab] = useState<Tab>("analysis");
  return (
    <div className="space-y-6">
      <PageHeader title="שיער ותספורות" subtitle="ניתוח שיער, Haircut Gallery, ומעקב אחרי תספורות שניסית." icon={<Scissors className="size-5" />} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "analysis", label: "ניתוח שיער" },
          { value: "gallery", label: "Haircut Gallery" },
          { value: "tried", label: "תספורות שניסיתי" },
        ]}
      />
      {tab === "analysis" && <Analysis />}
      {tab === "gallery" && <Gallery />}
      {tab === "tried" && <Tried />}
    </div>
  );
}

function useFaceShape(): string | null {
  const analyses = useStore((s) => s.analyses);
  const manual = useStore((s) => s.manualFaceShape);
  return analyses.find((a) => a.type === "face")?.result?.faceShape?.shape ?? manual ?? null;
}

function Analysis() {
  const ai = useAIStatus();
  const { run, loading, error, record, setRecord } = useAnalysis("hair");
  const profile = useStore((s) => s.profile);
  const faceShape = useFaceShape();
  const [image, setImage] = useState<Blob | null>(null);
  const [length, setLength] = useState("short");
  const [texture, setTexture] = useState("straight");

  const start = () =>
    run({
      image,
      extra: { faceShape: faceShape ?? undefined },
      demo: (q) => demoHair({ length, texture, faceShape, q, profile }),
    });

  if (record)
    return (
      <div className="space-y-4">
        <CloseResult onClick={() => setRecord(null)} />
        <HairResult r={record.result as HairAnalysis} source={record.source} />
        <AnalysisHistory type="hair" onOpen={setRecord} />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle>העלאת תמונת שיער</SectionTitle>
          <ImageUploader value={image} onChange={setImage} hint="שיער יבש ומסודר, מלפנים או מהצד" tips={["אור יום", "שיער במצבו הרגיל", "עדיף 2 זוויות — אפשר להריץ פעמיים"]} />
        </Card>
        <div className="space-y-4 lg:col-span-3">
          {!ai.loading && !ai.aiEnabled && (
            <Card>
              <SectionTitle>פרטי שיער (מצב דמו)</SectionTitle>
              <p className="mb-4 text-sm text-muted">במצב דמו אין זיהוי מהתמונה — בחרו בעצמכם:</p>
              <Field label="אורך">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["buzz", "קצר מאוד"],
                    ["short", "קצר"],
                    ["medium", "בינוני"],
                    ["long", "ארוך"],
                  ].map(([v, l]) => (
                    <Chip key={v} active={length === v} onClick={() => setLength(v)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
              <div className="mt-4">
                <Field label="מרקם">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["straight", "חלק"],
                      ["wavy", "גלי"],
                      ["curly", "מתולתל"],
                      ["coily", "תלתלים צפופים"],
                    ].map(([v, l]) => (
                      <Chip key={v} active={texture === v} onClick={() => setTexture(v)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            </Card>
          )}
          <Card>
            <div className="mb-3 text-sm">
              צורת פנים:{" "}
              {faceShape ? (
                <Badge tone="accent">{FACE_SHAPE_INFO[faceShape as FaceShape]?.label ?? faceShape}</Badge>
              ) : (
                <span className="text-muted">לא ידועה — הריצו ניתוח פנים לתוצאות מדויקות יותר</span>
              )}
            </div>
            {error && <ErrorBox message={error} onRetry={start} />}
            {loading ? (
              <Spinner label={ai.aiEnabled ? "ה-AI מנתח את השיער…" : "מכינים המלצות…"} />
            ) : (
              <Button size="lg" className="w-full" disabled={!image} icon={<Sparkles className="size-4" />} onClick={start}>
                {ai.aiEnabled ? "נתח שיער עם AI" : "קבל המלצות (דמו)"}
              </Button>
            )}
            <p className="mt-3 text-xs text-dim">לא מאבחנים נשירה או מצבים רפואיים. בכל חשש — רופא/ת עור.</p>
          </Card>
        </div>
      </div>
      <PhotoRatings scope="hair" image={image} />
      <AnalysisHistory type="hair" onOpen={setRecord} />
    </div>
  );
}

function Gallery() {
  const profile = useStore((s) => s.profile);
  const favorites = useStore((s) => s.favorites);
  const toggleFav = useStore((s) => s.toggleFavorite);
  const faceShape = useFaceShape();
  const [filter, setFilter] = useState<"all" | "recommended" | "favorites">(faceShape ? "recommended" : "all");
  const [length, setLength] = useState<string>("any");
  const [open, setOpen] = useState<Hairstyle | null>(null);

  const ranked = useMemo(() => matchHairstyles({ faceShape, audience: audienceFor(profile) }), [faceShape, profile]);
  const list = ranked.filter((h) => {
    if (filter === "favorites" && !favorites.includes(h.id)) return false;
    if (filter === "recommended" && h.match < 2) return false;
    if (length !== "any" && h.length !== length) return false;
    return true;
  });
  const topPick = faceShape ? ranked[0] : null;

  return (
    <div className="space-y-4">
      {topPick && (
        <Card className="flex flex-col gap-4 border-accent/30 bg-gradient-to-l from-accent-soft to-transparent sm:flex-row sm:items-center">
          <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
            <HairIllustration style={topPick} />
          </div>
          <div className="flex-1">
            <Badge tone="accent">ההמלצה האישית שלך</Badge>
            <div className="mt-1 text-lg font-semibold">{topPick.name}</div>
            <p className="text-sm text-muted">
              מתאים לפנים {FACE_SHAPE_INFO[faceShape as FaceShape]?.label}. {topPick.description}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setOpen(topPick)}>
            פרטים
          </Button>
        </Card>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>הכל</Chip>
        <Chip active={filter === "recommended"} onClick={() => setFilter("recommended")}>
          מומלץ לי{!faceShape && " (דרוש ניתוח פנים)"}
        </Chip>
        <Chip active={filter === "favorites"} onClick={() => setFilter("favorites")}>מועדפים ({favorites.length})</Chip>
        <span className="mx-1 h-5 w-px bg-line" />
        {[
          ["any", "כל האורכים"],
          ["buzz", "קצר מאוד"],
          ["short", "קצר"],
          ["medium", "בינוני"],
          ["long", "ארוך"],
        ].map(([v, l]) => (
          <Chip key={v} active={length === v} onClick={() => setLength(v)}>
            {l}
          </Chip>
        ))}
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {list.map((h) => {
            const fav = favorites.includes(h.id);
            return (
              <Card key={h.id} interactive className="relative overflow-hidden p-0">
                <button onClick={() => setOpen(h)} className="block w-full text-right">
                  <div className="relative aspect-square bg-surface-2">
                    <HairIllustration style={h} />
                    {faceShape && h.match >= 2 && (
                      <span className="absolute right-2 top-2">
                        <Badge tone="accent">
                          <Star className="size-3" /> מתאים לך
                        </Badge>
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold">{h.name}</div>
                    <div className="text-xs text-dim" dir="ltr">
                      {h.nameEn}
                    </div>
                    <div className="mt-1 text-xs text-muted">תחזוקה: {h.maintenance}</div>
                  </div>
                </button>
                <button
                  onClick={() => toggleFav(h.id)}
                  className="absolute left-2 top-2 grid size-9 place-items-center rounded-full bg-black/40 backdrop-blur"
                  aria-label={fav ? "הסר ממועדפים" : "הוסף למועדפים"}
                >
                  <Heart className={cn("size-4", fav ? "fill-pink-400 text-pink-400" : "text-white")} />
                </button>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Heart className="size-5" />} title="אין תסרוקות בסינון הזה" text="נסו לשנות את הסינון או להוסיף מועדפים." />
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} wide>
        {open && (
          <div className="space-y-4">
            <div className="mx-auto size-40 overflow-hidden rounded-2xl bg-surface-2">
              <HairIllustration style={open} />
            </div>
            <p className="text-sm text-muted">{open.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {open.faceShapes.map((f) => (
                <Badge key={f} tone={f === faceShape ? "accent" : "default"}>
                  פנים {FACE_SHAPE_INFO[f].label}
                </Badge>
              ))}
            </div>
            <div className="rounded-xl bg-accent-soft p-4 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-accent">מה לבקש מהספר</span>
                <CopyButton text={open.barberScript} />
              </div>
              {open.barberScript}
            </div>
            <div className="rounded-xl bg-surface-2 p-4 text-sm">
              <div className="mb-1 font-medium">עיצוב יומיומי</div>
              <span className="text-muted">{open.styling}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={favorites.includes(open.id) ? "secondary" : "primary"}
                icon={<Heart className="size-4" />}
                onClick={() => toggleFav(open.id)}
              >
                {favorites.includes(open.id) ? "הסר ממועדפים" : "שמור במועדפים"}
              </Button>
              <a href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(open.nameEn + " haircut")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" icon={<ExternalLink className="size-4" />}>
                  תמונות השראה
                </Button>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Tried() {
  const haircuts = useStore((s) => s.haircuts);
  const add = useStore((s) => s.addHaircut);
  const remove = useStore((s) => s.removeHaircut);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(4);
  const [date, setDate] = useState(dateKey());
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const imageId = photo ? await saveImage(photo) : undefined;
    add({ id: uid("hc"), date, name: name.trim(), notes, rating, imageId });
    setSaving(false);
    setOpen(false);
    setName("");
    setNotes("");
    setPhoto(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
          הוספת תספורת
        </Button>
      </div>
      {haircuts.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {haircuts.map((h) => (
            <Card key={h.id} className="p-0">
              {h.imageId && <StoredImage imageId={h.imageId} alt={h.name} className="aspect-[4/3] w-full rounded-t-2xl" />}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-xs text-dim">{heDate(h.date)}</div>
                  </div>
                  <button onClick={() => remove(h.id)} className="text-dim hover:text-danger" aria-label="מחיקה">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 text-accent">{"★".repeat(h.rating)}{"☆".repeat(5 - h.rating)}</div>
                {h.notes && <p className="mt-2 text-sm text-muted">{h.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Scissors className="size-5" />} title="עוד לא תיעדת תספורות" text="תיעוד עוזר לזכור מה עבד, ומה לבקש בפעם הבאה." />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="תספורת חדשה">
        <div className="space-y-4">
          <Field label="שם התספורת">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: קרופ טקסטורי, פייד נמוך" maxLength={60} />
          </Field>
          <Field label="תאריך">
            <Input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="כמה אהבת?">
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-accent" : "text-surface-3"}>
                  ★
                </button>
              ))}
            </div>
          </Field>
          <Field label="הערות (מה אמרת לספר, מה לשנות)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </Field>
          <div className="max-w-48">
            <ImageUploader value={photo} onChange={setPhoto} hint="תמונה (אופציונלי)" aspect="aspect-square" />
          </div>
          <Button className="w-full" disabled={!name.trim()} loading={saving} onClick={save}>
            שמירה
          </Button>
        </div>
      </Modal>
    </div>
  );
}

