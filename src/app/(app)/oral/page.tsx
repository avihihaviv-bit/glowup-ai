"use client";
import { useMemo, useState } from "react";
import { Check, Smile, CalendarClock, Plus, Trash2, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import type { OralDay } from "@/lib/types";
import { addDays, cn, dateKey, heDate, heDayShort, lastNDays, uid } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Select } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";

const ITEMS: { key: keyof OralDay; label: string; hint: string }[] = [
  { key: "am", label: "צחצוח בוקר", hint: "שתי דקות, משחה עם פלואוריד" },
  { key: "pm", label: "צחצוח ערב", hint: "לפני השינה, שתי דקות" },
  { key: "floss", label: "ניקוי בין השיניים", hint: "חוט דנטלי או מברשת בין-שינית" },
  { key: "tongue", label: "ניקוי לשון", hint: "בעדינות, מאחור לפנים" },
];

export default function OralPage() {
  const oral = useStore((s) => s.oral);
  const toggle = useStore((s) => s.toggleOral);
  const dentist = useStore((s) => s.dentist);
  const setDentist = useStore((s) => s.setDentist);
  const allProducts = useStore((s) => s.products);
  const products = useMemo(() => allProducts.filter((p) => p.category === "oral"), [allProducts]);
  const upsert = useStore((s) => s.upsertProduct);
  const remove = useStore((s) => s.removeProduct);
  const today = dateKey();
  const day = oral[today] ?? {};
  const doneCount = ITEMS.filter((i) => day[i.key]).length;
  const [newProduct, setNewProduct] = useState("");

  const streak = useMemo(() => {
    const full = (d: string) => oral[d]?.am && oral[d]?.pm;
    let n = 0;
    let d = full(today) ? today : addDays(today, -1);
    while (full(d)) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }, [oral, today]);

  const nextVisit = dentist.lastVisit ? addDays(dentist.lastVisit, Math.round(dentist.intervalMonths * 30.4)) : null;
  const overdue = nextVisit ? nextVisit < today : false;

  return (
    <div className="space-y-6">
      <PageHeader title="טיפוח הפה" subtitle="שגרה יומית, ניקוי בין השיניים, נשימה רעננה ותזכורת לרופא שיניים." icon={<Smile className="size-5" />} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle action={<Badge tone={doneCount === 4 ? "green" : "accent"}>{doneCount}/4 היום</Badge>}>השגרה של היום</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {ITEMS.map((it) => {
              const on = !!day[it.key];
              return (
                <button
                  key={it.key}
                  onClick={() => toggle(it.key)}
                  aria-pressed={on}
                  className={cn("flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-start transition", on ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-line-strong")}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl border-2", on ? "border-accent bg-accent text-white" : "border-line-strong")}>{on && <Check className="size-4" />}</span>
                  <span>
                    <span className="block text-sm font-semibold">{it.label}</span>
                    <span className="text-xs text-muted">{it.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>14 הימים האחרונים</span>
              <span>{streak} ימים ברצף של צחצוח פעמיים ביום</span>
            </div>
            <div className="grid grid-cols-14 gap-1.5">
              {lastNDays(14).map((d) => {
                const n = ITEMS.filter((i) => oral[d]?.[i.key]).length;
                return (
                  <div key={d} className="text-center">
                    <div className="mx-auto aspect-square w-full max-w-8 rounded-lg" style={{ background: `color-mix(in srgb, var(--accent) ${n * 25}%, var(--surface-3))` }} title={`${heDate(d)}: ${n}/4`} />
                    <div className="mt-1 text-[10px] text-dim">{heDayShort(d)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4 text-accent" /> ביקור אצל רופא שיניים
            </span>
          </SectionTitle>
          <div className="space-y-3">
            <Field label="הביקור האחרון">
              <Input id="dentist-last" type="date" max={today} value={dentist.lastVisit ?? ""} onChange={(e) => setDentist({ ...dentist, lastVisit: e.target.value || undefined })} />
            </Field>
            <Field label="תדירות (לפי המלצת רופא השיניים שלך)">
              <Select id="dentist-interval" value={dentist.intervalMonths} onChange={(e) => setDentist({ ...dentist, intervalMonths: Number(e.target.value) })}>
                {[3, 6, 9, 12, 18, 24].map((m) => (
                  <option key={m} value={m}>
                    כל {m} חודשים
                  </option>
                ))}
              </Select>
            </Field>
            {nextVisit ? (
              <div className={cn("rounded-2xl p-3 text-sm", overdue ? "bg-warn-bg text-warn" : "bg-accent-soft text-accent-strong")}>
                {overdue ? `הגיע הזמן לקבוע תור (היה מתוכנן ל-${heDate(nextVisit)})` : `הביקור הבא: ${heDate(nextVisit)}`}
              </div>
            ) : (
              <p className="text-sm text-muted">הזינו את תאריך הביקור האחרון כדי לקבל תזכורת.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>שגרת נשימה רעננה</SectionTitle>
          <ol className="space-y-3 text-sm">
            {[
              ["צחצוח יסודי", "שתי דקות, כולל קו החניכיים והשיניים האחוריות."],
              ["ניקוי בין השיניים", "שאריות אוכל בין השיניים הן מקור נפוץ לריח."],
              ["ניקוי לשון", "מגרד לשון או המברשת, בתנועה עדינה מאחור לפנים."],
              ["שתיית מים", "פה יבש מגביר ריח. כוס מים לאורך היום עוזרת."],
              ["מי פה (אופציונלי)", "תוספת בלבד, לא תחליף לצחצוח ולניקוי בין השיניים."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{i + 1}</span>
                <div>
                  <div className="font-medium">{t}</div>
                  <div className="text-muted">{d}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-dim">ריח פה שנמשך למרות שגרה טובה, דימום מהחניכיים או כאב מצדיקים בדיקה אצל רופא שיניים.</p>
        </Card>

        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <Info className="size-4 text-accent" /> מי פה: קוסמטי מול טיפולי
            </span>
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 p-3 text-sm">
              <div className="font-semibold">קוסמטי</div>
              <p className="mt-1 text-muted">מרענן ומסווה ריח לזמן קצר. לא מטפל בגורם.</p>
            </div>
            <div className="rounded-2xl bg-accent-soft p-3 text-sm">
              <div className="font-semibold text-accent-strong">טיפולי</div>
              <p className="mt-1 text-muted">מכיל רכיבים פעילים למטרה מוגדרת (למשל פלואוריד). השתמשו לפי ההוראות או המלצת רופא שיניים.</p>
            </div>
          </div>
          <p className="mt-3 rounded-2xl border border-line p-3 text-sm text-muted">מי פה לעולם לא מחליפים צחצוח פעמיים ביום וניקוי בין השיניים.</p>
          <SourceLinks topic="oral" />
        </Card>
      </div>

      <Card>
        <SectionTitle>המוצרים שלי</SectionTitle>
        <div className="mb-3 flex gap-2">
          <Input id="oral-product" value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="למשל: משחת שיניים עם פלואוריד" maxLength={80} />
          <Button
            icon={<Plus className="size-4" />}
            disabled={!newProduct.trim()}
            onClick={() => {
              upsert({ id: uid("p"), name: newProduct.trim(), category: "oral", use: "both", liked: false, notes: "" });
              setNewProduct("");
            }}
          >
            הוספה
          </Button>
        </div>
        {products.length ? (
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id} className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-white px-3 text-sm">
                {p.name}
                <button onClick={() => remove(p.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Smile className="size-5" />} title="עוד אין מוצרים" text="שמרו את המוצרים שאתם משתמשים בהם כדי שהמאמן יכיר אותם." />
        )}
      </Card>
    </div>
  );
}
