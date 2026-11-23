"use client";
import { useMemo, useState } from "react";
import { Shirt, Plus, Trash2, Heart, Wand2, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Outfit, WardrobeItem } from "@/lib/types";
import { COLOR_RULES } from "@/lib/knowledge";
import { saveImage } from "@/lib/images";
import { cn, uid } from "@/lib/utils";
import { Badge, Button, Card, Chip, EmptyState, Field, Input, Modal, PageHeader, SectionTitle, Segmented, Select } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";
import { StoredImage } from "@/components/StoredImage";
import { WeatherCard, useWeather } from "@/components/WeatherCard";

const SLOTS: { id: WardrobeItem["slot"]; label: string }[] = [
  { id: "top", label: "חלק עליון" },
  { id: "bottom", label: "חלק תחתון" },
  { id: "shoes", label: "נעליים" },
  { id: "outer", label: "שכבה עליונה" },
  { id: "accessory", label: "אביזר" },
];
const COLORS = ["שחור", "לבן", "אפור", "נייבי", "בז׳", "קרם", "חום", "זית", "חום קאמל", "כחול", "תכלת", "ירוק", "בורדו", "אדום", "כתום", "צהוב", "חרדל", "סגול", "ורוד", "חאקי"];
const OCCASIONS = ["יומיומי", "לימודים / עבודה", "ערב", "אירוע", "ספורט"];
const SWATCH: Record<string, string> = { שחור: "#111", לבן: "#fff", אפור: "#9aa3ae", נייבי: "#1d2b4f", "בז׳": "#d8c3a5", קרם: "#f1e7d0", חום: "#6b4a2f", זית: "#6b7040", "חום קאמל": "#b5814a", כחול: "#2a5bd7", תכלת: "#8fc4ef", ירוק: "#2f8f5b", בורדו: "#6d1f2c", אדום: "#c62f2f", כתום: "#e6782f", צהוב: "#f0c93a", חרדל: "#c9a227", סגול: "#6c4ab6", ורוד: "#eaa1b8", חאקי: "#b9a77a" };

/** Rule-based color check (same transparent rules as the style guide). Rates the clothes only. */
function colorCheck(colors: string[]) {
  const strong = [...new Set(colors.filter((c) => !COLOR_RULES.neutrals.includes(c)))];
  const notes: string[] = [];
  let ok = true;
  if (strong.length <= 1) notes.push(strong.length ? `צבע בולט אחד (${strong[0]}) על בסיס ניטרלי. קל לטעות פחות.` : "כולו ניטרלי: מסודר ובטוח.");
  if (strong.length >= 3) {
    ok = false;
    notes.push("שלושה צבעים בולטים או יותר. נסו להחליף פריט אחד בניטרלי.");
  }
  const pair = COLOR_RULES.pairs.find((p) => colors.includes(p.a) && colors.includes(p.b));
  if (pair) notes.push(`${pair.a} + ${pair.b}: ${pair.note}.`);
  return { ok, notes };
}

function ItemThumb({ w, active, onClick }: { w: WardrobeItem; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn("flex w-full items-center gap-2 rounded-2xl border bg-white p-2 text-start transition", active ? "border-accent ring-2 ring-accent-soft" : "border-line hover:border-line-strong")}>
      {w.imageId ? <StoredImage imageId={w.imageId} alt="" className="size-12 shrink-0 rounded-xl" /> : <span className="size-12 shrink-0 rounded-xl border border-line" style={{ background: SWATCH[w.color] ?? "#ddd" }} />}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{w.name}</span>
        <span className="text-xs text-dim">{w.color}</span>
      </span>
    </button>
  );
}

export default function OutfitsPage() {
  const wardrobe = useStore((s) => s.wardrobe);
  const outfits = useStore((s) => s.outfits);
  const upsertW = useStore((s) => s.upsertWardrobe);
  const removeW = useStore((s) => s.removeWardrobe);
  const upsertO = useStore((s) => s.upsertOutfit);
  const removeO = useStore((s) => s.removeOutfit);
  const { weather } = useWeather();
  const [tab, setTab] = useState<"build" | "wardrobe" | "saved">("build");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<WardrobeItem, "id" | "imageId">>({ name: "", slot: "top", color: "לבן", seasons: [], occasions: [] });
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [pick, setPick] = useState<Partial<Record<WardrobeItem["slot"], string>>>({});
  const [outfitName, setOutfitName] = useState("");
  const [occasion, setOccasion] = useState("יומיומי");
  const [saved, setSaved] = useState(false);

  const chosen = Object.values(pick).map((id) => wardrobe.find((w) => w.id === id)).filter((x): x is WardrobeItem => !!x);
  const check = chosen.length >= 2 ? colorCheck(chosen.map((c) => c.color)) : null;

  const suggestion = useMemo(() => {
    const kind = weather?.kind === "rain" ? "cold" : weather?.kind;
    const fits = (w: WardrobeItem) => (!kind || !w.seasons.length || w.seasons.includes(kind)) && (!w.occasions.length || w.occasions.includes(occasion));
    const by = (slot: WardrobeItem["slot"]) => wardrobe.filter((w) => w.slot === slot && fits(w));
    const tops = by("top"), bottoms = by("bottom"), shoes = by("shoes");
    let best: { items: WardrobeItem[]; score: number } | null = null;
    for (const t of tops) for (const b of bottoms) for (const s of shoes.length ? shoes : [undefined]) {
      const items = [t, b, ...(s ? [s] : [])];
      const c = colorCheck(items.map((x) => x.color));
      const score = (c.ok ? 2 : 0) + c.notes.length;
      if (!best || score > best.score) best = { items, score };
    }
    if (best && (kind === "cold") ) {
      const outer = by("outer")[0];
      if (outer) best.items.push(outer);
    }
    return best?.items ?? null;
  }, [wardrobe, weather, occasion]);

  async function addItem() {
    const imageId = photo ? await saveImage(photo) : undefined;
    upsertW({ id: uid("w"), ...draft, name: draft.name.trim() || `${SLOTS.find((s) => s.id === draft.slot)?.label} ${draft.color}`, imageId });
    setAdding(false);
    setPhoto(null);
    setDraft({ name: "", slot: draft.slot, color: draft.color, seasons: [], occasions: [] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outfit Studio"
        subtitle="הארון שלך, בניית לבושים, התאמת צבעים והצעות לפי מזג אוויר ואירוע."
        icon={<Shirt className="size-5" />}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>פריט חדש</Button>}
      />
      <Segmented<"build" | "wardrobe" | "saved">
        value={tab}
        onChange={setTab}
        options={[
          { value: "build", label: "בניית לבוש" },
          { value: "wardrobe", label: `הארון (${wardrobe.length})` },
          { value: "saved", label: `שמורים (${outfits.length})` },
        ]}
      />

      {tab === "build" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {wardrobe.length === 0 ? (
              <EmptyState icon={<Shirt className="size-5" />} title="הארון ריק" text="הוסיפו כמה פריטים (אפשר עם תמונה) כדי לבנות לבושים." action={<Button onClick={() => setAdding(true)}>פריט חדש</Button>} />
            ) : (
              SLOTS.map((slot) => {
                const items = wardrobe.filter((w) => w.slot === slot.id);
                if (!items.length) return null;
                return (
                  <Card key={slot.id} className="p-4">
                    <div className="mb-2 text-sm font-semibold">{slot.label}</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {items.map((w) => (
                        <ItemThumb key={w.id} w={w} active={pick[slot.id] === w.id} onClick={() => (setSaved(false), setPick((p) => ({ ...p, [slot.id]: p[slot.id] === w.id ? undefined : w.id })))} />
                      ))}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
          <div className="space-y-4">
            <Card>
              <SectionTitle>הלבוש שבנית</SectionTitle>
              {chosen.length ? (
                <>
                  <div className="flex gap-1.5">
                    {chosen.map((c) => (
                      <span key={c.id} className="h-10 flex-1 rounded-xl border border-line" style={{ background: SWATCH[c.color] ?? "#ddd" }} title={c.name} />
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted">
                    {chosen.map((c) => (
                      <li key={c.id}>• {c.name}</li>
                    ))}
                  </ul>
                  {check && (
                    <div className={cn("mt-3 rounded-2xl p-3 text-sm", check.ok ? "bg-accent-soft text-accent-strong" : "bg-warn-bg text-warn")}>
                      {check.notes.map((n) => (
                        <p key={n}>{n}</p>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Input id="outfit-name" value={outfitName} onChange={(e) => setOutfitName(e.target.value)} placeholder="שם ללבוש" aria-label="שם ללבוש" maxLength={40} />
                    <Button
                      icon={saved ? <Check className="size-4" /> : undefined}
                      disabled={chosen.length < 2 || saved}
                      onClick={() => {
                        const o: Outfit = { id: uid("of"), name: outfitName.trim() || `לבוש ${outfits.length + 1}`, items: chosen.map((c) => c.id), favorite: false, createdAt: new Date().toISOString() };
                        upsertO(o);
                        setSaved(true);
                        setOutfitName("");
                      }}
                    >
                      {saved ? "נשמר" : "שמירה"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">בחרו פריט אחד מכל קטגוריה.</p>
              )}
            </Card>
            <Card>
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Wand2 className="size-4 text-accent" /> הצעה מהארון
                </span>
              </SectionTitle>
              <Select aria-label="אירוע" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                {OCCASIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              {suggestion ? (
                <div className="mt-3 space-y-2">
                  {suggestion.map((w) => (
                    <ItemThumb key={w.id} w={w} />
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => setPick(Object.fromEntries(suggestion.map((w) => [w.slot, w.id])))}>
                    להשתמש בהצעה
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">צריך לפחות חלק עליון וחלק תחתון שמתאימים למזג האוויר ולאירוע.</p>
              )}
            </Card>
            <WeatherCard compact />
          </div>
        </div>
      )}

      {tab === "wardrobe" &&
        (wardrobe.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {wardrobe.map((w) => (
              <Card key={w.id} className="relative overflow-hidden p-0">
                {w.imageId ? <StoredImage imageId={w.imageId} alt={w.name} className="aspect-square w-full" /> : <div className="aspect-square w-full" style={{ background: SWATCH[w.color] ?? "#ddd" }} />}
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{w.name}</div>
                  <div className="text-xs text-dim">{SLOTS.find((s) => s.id === w.slot)?.label} · {w.color}</div>
                </div>
                <button onClick={() => removeW(w.id)} className="absolute end-2 top-2 grid size-9 place-items-center rounded-full bg-white/90 text-dim hover:text-danger" aria-label="מחיקת פריט">
                  <Trash2 className="size-4" />
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Shirt className="size-5" />} title="הארון ריק" action={<Button onClick={() => setAdding(true)}>פריט חדש</Button>} />
        ))}

      {tab === "saved" &&
        (outfits.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {outfits.map((o) => {
              const items = o.items.map((id) => wardrobe.find((w) => w.id === id)).filter((x): x is WardrobeItem => !!x);
              return (
                <Card key={o.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{o.name}</span>
                    <div className="flex">
                      <button onClick={() => upsertO({ ...o, favorite: !o.favorite })} className="grid size-9 place-items-center" aria-label={o.favorite ? "הסר ממועדפים" : "מועדף"}>
                        <Heart className={cn("size-4", o.favorite ? "fill-accent text-accent" : "text-dim")} />
                      </button>
                      <button onClick={() => removeO(o.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {items.map((w) => (w.imageId ? <StoredImage key={w.id} imageId={w.imageId} alt={w.name} className="aspect-square w-full rounded-xl" /> : <span key={w.id} className="aspect-square rounded-xl border border-line" style={{ background: SWATCH[w.color] ?? "#ddd" }} title={w.name} />))}
                  </div>
                  <p className="mt-2 text-xs text-muted">{items.map((w) => w.name).join(" · ")}</p>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Heart className="size-5" />} title="אין לבושים שמורים" text="בנו לבוש ושמרו אותו." />
        ))}

      <Modal open={adding} onClose={() => setAdding(false)} title="פריט חדש לארון" wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <ImageUploader value={photo} onChange={setPhoto} hint="תמונה של הפריט (אופציונלי)" aspect="aspect-square" />
          </div>
          <div className="space-y-3">
            <Field label="שם">
              <Input id="w-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="למשל: חולצת אוקספורד" maxLength={40} />
            </Field>
            <Field label="סוג">
              <Select id="w-slot" value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value as WardrobeItem["slot"] })}>
                {SLOTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="צבע עיקרי">
              <Select id="w-color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })}>
                {COLORS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="מזג אוויר">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["hot", "חם"],
                    ["mild", "נעים"],
                    ["cold", "קר"],
                  ] as const
                ).map(([v, l]) => (
                  <Chip key={v} active={draft.seasons.includes(v)} onClick={() => setDraft({ ...draft, seasons: draft.seasons.includes(v) ? draft.seasons.filter((x) => x !== v) : [...draft.seasons, v] })}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="מתאים ל">
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <Chip key={o} active={draft.occasions.includes(o)} onClick={() => setDraft({ ...draft, occasions: draft.occasions.includes(o) ? draft.occasions.filter((x) => x !== o) : [...draft.occasions, o] })}>
                    {o}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={addItem}>
          הוספה לארון
        </Button>
        <p className="mt-2 text-center text-xs text-dim">
          <Badge>הצבעים נבדקים לפי כללים פשוטים ושקופים</Badge>
        </p>
      </Modal>
    </div>
  );
}
