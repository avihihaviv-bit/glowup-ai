"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SprayCan, Plus, Trash2, Star, Pencil, BookOpen, WandSparkles, ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Concentration, Fragrance } from "@/lib/types";
import { cn, dateKey, heDate, uid } from "@/lib/utils";
import { Badge, Button, Card, Chip, EmptyState, Field, Input, Modal, PageHeader, SectionTitle, Segmented, Select, Textarea } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";

type Tab = "collection" | "today" | "event" | "compare" | "guide" | "journal";
const SEASONS = [
  ["spring", "אביב"],
  ["summer", "קיץ"],
  ["autumn", "סתיו"],
  ["winter", "חורף"],
] as const;
const OCCASIONS = ["יומיומי", "לימודים / עבודה", "ערב", "אירוע", "דייט", "ספורט"];
const CONC: Concentration[] = ["EDC", "EDT", "EDP", "Parfum", "Other"];

function currentSeason(): Fragrance["seasons"][number] {
  const m = new Date().getMonth() + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 9 ? "summer" : m >= 10 && m <= 11 ? "autumn" : "winter";
}

/** Conservative spray count. Never encourages heavy application. */
function sprayAdvice(c: Concentration, opts: { indoor: boolean; hot: boolean; intensity: "light" | "moderate" }) {
  let n = { EDC: 3, EDT: 2, EDP: 2, Parfum: 1, Other: 2 }[c];
  if (opts.indoor) n -= 1;
  if (opts.hot) n -= 1;
  if (opts.intensity === "light") n -= 1;
  return Math.max(1, Math.min(3, n));
}

function pick(frs: Fragrance[], occasion: string, season: Fragrance["seasons"][number], avoidId?: string) {
  const scored = frs.map((f) => {
    let s = f.rating;
    if (f.seasons.includes(season)) s += 2;
    if (f.occasions.includes(occasion)) s += 3;
    if (f.id === avoidId) s -= 2;
    return { f, s };
  });
  return scored.sort((a, b) => b.s - a.s)[0]?.f;
}

export default function FragrancePage() {
  const frs = useStore((s) => s.fragrances);
  const log = useStore((s) => s.fragranceLog);
  const upsert = useStore((s) => s.upsertFragrance);
  const remove = useStore((s) => s.removeFragrance);
  const addLog = useStore((s) => s.addFragranceLog);
  const removeLog = useStore((s) => s.removeFragranceLog);
  const [tab, setTab] = useState<Tab>("collection");
  const [edit, setEdit] = useState<Fragrance | null>(null);
  const season = currentSeason();
  const lastWorn = log[0]?.fragranceId;
  const today = useMemo(() => pick(frs, "יומיומי", season, lastWorn), [frs, season, lastWorn]);
  const [ev, setEv] = useState({ occasion: "אירוע", indoor: true, hot: false, intensity: "moderate" as "light" | "moderate" });
  const eventPick = useMemo(() => pick(frs, ev.occasion, season), [frs, ev.occasion, season]);
  const [cmp, setCmp] = useState<[string, string]>(["", ""]);
  const [logForm, setLogForm] = useState({ fragranceId: "", sprays: 2, occasion: "יומיומי", notes: "" });

  const empty = (): Fragrance => ({ id: uid("fr"), name: "", brand: "", concentration: "EDT", family: "", seasons: [], occasions: [], rating: 3, longevity: "", projection: "", notes: "" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="מרכז הבשמים"
        subtitle="האוסף שלך, בחירה יומית ובחירה לאירוע, והנחיות לשימוש מאופק."
        icon={<SprayCan className="size-5" />}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEdit(empty())}>
            הוספת בושם
          </Button>
        }
      />
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="w-max">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "collection", label: "האוסף" },
              { value: "today", label: "היום" },
              { value: "event", label: "לאירוע" },
              { value: "compare", label: "השוואה" },
              { value: "guide", label: "מדריך" },
              { value: "journal", label: "יומן" },
            ]}
          />
        </div>
      </div>

      <Link href="/advisor" onClick={() => useStore.getState().setAdvisorCat("fragrance")} className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-gradient-to-l from-accent-soft to-white p-4 transition hover:border-accent">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white"><WandSparkles className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">יועץ ריחות: מה מתאים לי?</span>
          <span className="block text-sm text-muted">כותבים מה אוהבים (מתוק, רענן, עצי…) ומקבלים עצה, כולל מתוך האוסף שלך.</span>
        </span>
        <ChevronLeft className="size-5 shrink-0 text-accent rtl:rotate-0 ltr:rotate-180" />
      </Link>

      {tab === "collection" &&
        (frs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {frs.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{f.name}</div>
                    <div className="text-xs text-muted">{f.brand || "—"} · {f.concentration}</div>
                  </div>
                  <div className="flex">
                    <button onClick={() => setEdit(f)} className="grid size-9 place-items-center text-dim hover:text-fg" aria-label="עריכה">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => remove(f.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-accent">{"★".repeat(f.rating)}<span className="text-surface-3">{"★".repeat(5 - f.rating)}</span></div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.family && <Badge>{f.family}</Badge>}
                  {f.seasons.map((s) => (
                    <Badge key={s} tone="accent">{SEASONS.find((x) => x[0] === s)?.[1]}</Badge>
                  ))}
                </div>
                {(f.longevity || f.projection) && <p className="mt-2 text-xs text-muted">{[f.longevity && `עמידות: ${f.longevity}`, f.projection && `הקרנה: ${f.projection}`].filter(Boolean).join(" · ")}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<SprayCan className="size-5" />} title="האוסף ריק" text="הוסיפו את הבשמים שיש לכם. ההמלצות מבוססות רק על המידע שתזינו." action={<Button onClick={() => setEdit(empty())}>הוספת בושם</Button>} />
        ))}

      {tab === "today" && (
        <Card>
          <SectionTitle>הבושם של היום</SectionTitle>
          {today ? (
            <>
              <div className="text-2xl font-extrabold">{today.name}</div>
              <p className="mt-1 text-sm text-muted">
                נבחר לפי הדירוג שלך, העונה ({SEASONS.find((x) => x[0] === season)?.[1]}) והתאמה ליום יומי{lastWorn === today.id ? "" : ", ולא הבושם שלבשת אחרון"}.
              </p>
              <div className="mt-3 rounded-2xl bg-accent-soft p-3 text-sm text-accent-strong">
                המלצה: {sprayAdvice(today.concentration, { indoor: true, hot: season === "summer", intensity: "moderate" })} התזות, על החזה או הצוואר.
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">הוסיפו בושם לאוסף כדי לקבל בחירה יומית.</p>
          )}
        </Card>
      )}

      {tab === "event" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-4">
            <SectionTitle>פרטי האירוע</SectionTitle>
            <Field label="סוג אירוע">
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <Chip key={o} active={ev.occasion === o} onClick={() => setEv({ ...ev, occasion: o })}>
                    {o}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="מקום">
              <div className="flex gap-2">
                <Chip active={ev.indoor} onClick={() => setEv({ ...ev, indoor: true })}>בפנים / חלל קטן</Chip>
                <Chip active={!ev.indoor} onClick={() => setEv({ ...ev, indoor: false })}>בחוץ</Chip>
              </div>
            </Field>
            <Field label="מזג אוויר">
              <div className="flex gap-2">
                <Chip active={ev.hot} onClick={() => setEv({ ...ev, hot: true })}>חם</Chip>
                <Chip active={!ev.hot} onClick={() => setEv({ ...ev, hot: false })}>נעים / קר</Chip>
              </div>
            </Field>
            <Field label="עוצמה רצויה">
              <div className="flex gap-2">
                <Chip active={ev.intensity === "light"} onClick={() => setEv({ ...ev, intensity: "light" })}>עדינה</Chip>
                <Chip active={ev.intensity === "moderate"} onClick={() => setEv({ ...ev, intensity: "moderate" })}>בינונית</Chip>
              </div>
            </Field>
          </Card>
          <Card>
            <SectionTitle>ההמלצה</SectionTitle>
            {eventPick ? (
              <>
                <div className="text-2xl font-extrabold">{eventPick.name}</div>
                <p className="mt-1 text-sm text-muted">מתוך האוסף שלך, לפי התאמה לאירוע, לעונה ולדירוג שלך.</p>
                <div className="mt-3 text-5xl font-extrabold text-accent">{sprayAdvice(eventPick.concentration, ev)}</div>
                <div className="text-sm text-muted">התזות לכל היותר</div>
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  <li>• לרסס על החזה או הצוואר מרחק 10-15 ס״מ, לא על הפנים.</li>
                  <li>• לתת לבושם להתייבש לפני ההתלבשות.</li>
                  {ev.indoor && <li>• בחלל סגור, פחות זה יותר. אנשים קרובים מרגישים הרבה.</li>}
                  {ev.hot && <li>• בחום הבושם מורגש חזק יותר.</li>}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted">הוסיפו בשמים לאוסף כדי לקבל המלצה לאירוע.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "compare" && (
        <Card>
          <SectionTitle>השוואה בין שני בשמים מהאוסף</SectionTitle>
          {frs.length < 2 ? (
            <p className="text-sm text-muted">צריך לפחות שני בשמים באוסף.</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <Select key={i} aria-label={`בושם ${i + 1}`} value={cmp[i]} onChange={(e) => setCmp((c) => (i === 0 ? [e.target.value, c[1]] : [c[0], e.target.value]))}>
                    <option value="">בחירה…</option>
                    {frs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <tbody>
                    {(
                      [
                        ["ריכוז", (f: Fragrance) => f.concentration],
                        ["משפחה", (f: Fragrance) => f.family || "—"],
                        ["עונות", (f: Fragrance) => f.seasons.map((s) => SEASONS.find((x) => x[0] === s)?.[1]).join(", ") || "—"],
                        ["אירועים", (f: Fragrance) => f.occasions.join(", ") || "—"],
                        ["הדירוג שלך", (f: Fragrance) => `${f.rating}/5`],
                        ["עמידות (לפי הרשום שלך)", (f: Fragrance) => f.longevity || "—"],
                        ["הקרנה (לפי הרשום שלך)", (f: Fragrance) => f.projection || "—"],
                        ["פעמים ביומן", (f: Fragrance) => String(log.filter((l) => l.fragranceId === f.id).length)],
                      ] as [string, (f: Fragrance) => string][]
                    ).map(([label, fn]) => (
                      <tr key={label} className="border-t border-line">
                        <td className="py-2 text-xs text-dim">{label}</td>
                        {cmp.map((id, i) => {
                          const f = frs.find((x) => x.id === id);
                          return (
                            <td key={i} className="py-2">
                              {f ? fn(f) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === "guide" && (
        <Card>
          <SectionTitle>מדריך שימוש מאופק</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["מתחילים ממעט", "1-2 התזות מספיקות לרוב. תמיד אפשר להוסיף, אי אפשר להוריד."],
              ["איפה", "חזה, צוואר או פרקי ידיים. לא ליד העיניים, לא על הפנים ולא על עור מגורה או פצוע."],
              ["לא לשפשף", "שפשוף פרקי הידיים לא נחוץ. פשוט לתת להתייבש."],
              ["להתייבש לפני לבוש", "בושם על בד עלול להכתים בדים בהירים."],
              ["לא לערבב יותר מדי", "שילוב של כמה ריחות חזקים (בושם, דאודורנט מבושם, ג׳ל שיער) יכול להיות מכביד."],
              ["חללים קטנים", "ברכב, בכיתה או במעלית, פחות התזות. אנשים קרובים מרגישים יותר."],
              ["עור רגיש", "אם מופיעים אדמומיות או גרד, להפסיק. מוצרים 'fragrance-free' עדיפים לעור רגיש."],
              ["בדיקה לפני אירוע", "לא לנסות בושם חדש בפעם הראשונה ביום של אירוע חשוב."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-surface-2 p-3 text-sm">
                <div className="font-semibold">{t}</div>
                <p className="mt-1 text-muted">{d}</p>
              </div>
            ))}
          </div>
          <SourceLinks topic="fragrance" />
        </Card>
      )}

      {tab === "journal" && (
        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="space-y-3 lg:col-span-2">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <BookOpen className="size-4 text-accent" /> רישום ליומן
              </span>
            </SectionTitle>
            <Field label="בושם">
              <Select id="fl-fr" value={logForm.fragranceId} onChange={(e) => setLogForm({ ...logForm, fragranceId: e.target.value })}>
                <option value="">בחירה…</option>
                {frs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="מספר התזות">
              <Input id="fl-sprays" type="number" min={1} max={6} value={logForm.sprays} onChange={(e) => setLogForm({ ...logForm, sprays: Number(e.target.value) })} />
            </Field>
            <Field label="אירוע">
              <Select id="fl-occ" value={logForm.occasion} onChange={(e) => setLogForm({ ...logForm, occasion: e.target.value })}>
                {OCCASIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="הערות (כמה זמן הרגשתי אותו, תגובות)">
              <Textarea id="fl-notes" value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} className="min-h-16!" maxLength={300} />
            </Field>
            <Button
              className="w-full"
              disabled={!logForm.fragranceId}
              onClick={() => {
                addLog({ id: uid("fl"), date: dateKey(), ...logForm, notes: logForm.notes.trim() });
                setLogForm({ ...logForm, notes: "" });
              }}
            >
              שמירה
            </Button>
          </Card>
          <Card className="lg:col-span-3">
            <SectionTitle>היומן</SectionTitle>
            {log.length ? (
              <ul className="divide-y divide-line">
                {log.slice(0, 40).map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {frs.find((f) => f.id === l.fragranceId)?.name ?? "בושם שנמחק"} · {l.sprays} התזות
                      </div>
                      <div className="text-xs text-muted">
                        {heDate(l.date)} · {l.occasion}
                      </div>
                      {l.notes && <div className="text-muted">{l.notes}</div>}
                    </div>
                    <button onClick={() => removeLog(l.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">עוד אין רישומים.</p>
            )}
          </Card>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name ? "עריכת בושם" : "בושם חדש"} wide>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="שם">
                <Input id="fr-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={80} />
              </Field>
              <Field label="מותג">
                <Input id="fr-brand" value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} maxLength={60} />
              </Field>
              <Field label="ריכוז">
                <Select id="fr-conc" value={edit.concentration} onChange={(e) => setEdit({ ...edit, concentration: e.target.value as Concentration })}>
                  {CONC.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="משפחה (כפי שכתוב על הבקבוק או לפי ההרגשה שלך)">
                <Input id="fr-family" value={edit.family} onChange={(e) => setEdit({ ...edit, family: e.target.value })} placeholder="למשל: הדרים, עצי, פרחוני" maxLength={40} />
              </Field>
            </div>
            <Field label="עונות">
              <div className="flex flex-wrap gap-2">
                {SEASONS.map(([v, l]) => (
                  <Chip key={v} active={edit.seasons.includes(v)} onClick={() => setEdit({ ...edit, seasons: edit.seasons.includes(v) ? edit.seasons.filter((x) => x !== v) : [...edit.seasons, v] })}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="אירועים">
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <Chip key={o} active={edit.occasions.includes(o)} onClick={() => setEdit({ ...edit, occasions: edit.occasions.includes(o) ? edit.occasions.filter((x) => x !== o) : [...edit.occasions, o] })}>
                    {o}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="הדירוג שלך">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setEdit({ ...edit, rating: n })} className="grid size-10 place-items-center" aria-label={`${n} כוכבים`}>
                    <Star className={cn("size-6", n <= edit.rating ? "fill-accent text-accent" : "text-surface-3")} />
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="עמידות (מה שאתה חווה)">
                <Input id="fr-long" value={edit.longevity} onChange={(e) => setEdit({ ...edit, longevity: e.target.value })} placeholder="למשל: כ-5 שעות על העור" maxLength={60} />
              </Field>
              <Field label="הקרנה (מה שאתה חווה)">
                <Input id="fr-proj" value={edit.projection} onChange={(e) => setEdit({ ...edit, projection: e.target.value })} placeholder="למשל: קרוב לעור" maxLength={60} />
              </Field>
            </div>
            <Field label="הערות">
              <Textarea id="fr-notes" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className="min-h-16!" maxLength={300} />
            </Field>
            <Button
              className="w-full"
              disabled={!edit.name.trim()}
              onClick={() => {
                upsert({ ...edit, name: edit.name.trim(), brand: edit.brand.trim() });
                setEdit(null);
              }}
            >
              שמירה
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
