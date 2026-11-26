"use client";
import { useState } from "react";
import { Droplets, Heart, Plus, Sparkles, Trash2, Stethoscope } from "lucide-react";
import { useAIStatus } from "@/lib/api";
import { useAnalysis } from "@/lib/useAnalysis";
import { useStore } from "@/lib/store";
import { demoSkin } from "@/lib/demo";
import { SKIN_CONCERNS } from "@/lib/knowledge";
import type { SkinRoutine } from "@/lib/schemas";
import type { Product } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { Segmented, Button, Card, Chip, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, SectionTitle, Select, Spinner, Textarea } from "@/components/ui";
import { AnalysisHistory, CloseResult, SkinResult } from "@/components/results";
import { SkinScanPanel } from "@/components/SkinScan";

const SKIN_TYPES = [
  ["oily", "שמנוני"],
  ["dry", "יבש"],
  ["combination", "מעורב"],
  ["normal", "רגיל"],
  ["sensitive", "רגיש"],
  ["unknown", "לא יודע/ת"],
] as const;

const CAT_LABEL: Record<Product["category"], string> = {
  cleanser: "ניקוי",
  moisturizer: "לחות",
  spf: "SPF",
  serum: "סרום/טיפול",
  hair: "שיער",
  oral: "פה ושיניים",
  deodorant: "דאודורנט",
  other: "אחר",
};

export default function SkinPage() {
  const [tab, setTab] = useState<"routine" | "scan">("routine");
  return (
    <div className="space-y-6">
      <PageHeader title="טיפוח עור" subtitle="סריקה לפי אזורים, ושגרה פשוטה ומותאמת: בוקר, ערב, אחרי אימון ולפני אירוע." icon={<Droplets className="size-5" />} />
      <Segmented<"routine" | "scan">
        value={tab}
        onChange={setTab}
        options={[
          { value: "routine", label: "שגרת טיפוח" },
          { value: "scan", label: "סריקת עור" },
        ]}
      />
      {tab === "routine" ? <SkinRoutineView /> : <SkinScanPanel />}
    </div>
  );
}

function SkinRoutineView() {
  const ai = useAIStatus();
  const profile = useStore((s) => s.profile)!;
  const updateProfile = useStore((s) => s.updateProfile);
  const products = useStore((s) => s.products);
  const lastRoutine = useStore((s) => s.analyses.find((a) => a.type === "skin"));
  const { run, loading, error, record, setRecord } = useAnalysis("skin");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(8);
  const [extra, setExtra] = useState("");
  const [showForm, setShowForm] = useState(!lastRoutine);

  const shown = record ?? (!showForm ? lastRoutine : null);

  function start() {
    const productText = [...products.filter((p) => p.category !== "hair").map((p) => `${p.name} (${CAT_LABEL[p.category]})`), extra]
      .filter(Boolean)
      .join(", ");
    const payload = { skinType: profile.skinType, concerns, products: productText, minutes };
    run({ extra: payload, demo: () => demoSkin({ ...payload, saved: products.map((p) => ({ name: p.name, category: p.category })) }) }).then((r) => r && setShowForm(false));
  }

  return (
    <div className="space-y-6">
      {shown && (
        <div className="flex justify-end">
          <CloseResult onClick={() => (setRecord(null), setShowForm(true))} />
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        <Stethoscope className="mt-0.5 size-5 shrink-0 text-accent" />
        <span>
          GLOWUP AI לא מאבחן בעיות עור ולא מנתח תמונות עור לצורך אבחון. אם יש אקנה כואב, פריחה מתמשכת, שינוי בשומה או כל דבר שמדאיג — פנו לרופא/ת עור.
        </span>
      </div>

      {shown ? (
        <SkinResult r={shown.result as SkinRoutine} source={shown.source} fallback={shown.fallback} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="space-y-5 lg:col-span-3">
            <SectionTitle>בניית שגרה</SectionTitle>
            <Field label="סוג עור">
              <div className="flex flex-wrap gap-2">
                {SKIN_TYPES.map(([v, l]) => (
                  <Chip key={v} active={profile.skinType === v} onClick={() => updateProfile({ skinType: v })}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="על מה רוצים לעבוד? (אופציונלי)">
              <div className="flex flex-wrap gap-2">
                {SKIN_CONCERNS.map((c) => (
                  <Chip key={c} active={concerns.includes(c)} onClick={() => setConcerns((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label={`זמן מקסימלי ביום: ${minutes} דקות`}>
              <input type="range" min={3} max={25} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full" />
            </Field>
            <Field label="מוצרים נוספים שיש לך (אופציונלי)" hint="המוצרים מהרשימה בצד נכללים אוטומטית">
              <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="למשל: סבון פנים של..., קרם עם ויטמין C" maxLength={800} />
            </Field>
            {error && <ErrorBox message={error} onRetry={start} />}
            {loading ? (
              <Spinner label={ai.aiEnabled ? "ה-AI בונה שגרה…" : "בונים שגרה…"} />
            ) : (
              <Button size="lg" className="w-full" icon={<Sparkles className="size-4" />} onClick={start}>
                {ai.aiEnabled ? "בנה שגרה עם AI" : "בנה שגרה (דמו)"}
              </Button>
            )}
          </Card>
          <div className="lg:col-span-2">
            <ProductsCard />
          </div>
        </div>
      )}

      {shown && <ProductsCard />}
      <AnalysisHistory type="skin" onOpen={(r) => (setRecord(r), setShowForm(false))} />
    </div>
  );
}

function ProductsCard() {
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertProduct);
  const remove = useStore((s) => s.removeProduct);
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <Card>
      <SectionTitle
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing({ id: uid("p"), name: "", category: "cleanser", use: "both", liked: false, notes: "" })}>
            הוספה
          </Button>
        }
      >
        המוצרים שלי
      </SectionTitle>
      {products.length ? (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 p-3">
              <button onClick={() => upsert({ ...p, liked: !p.liked })} aria-label="אהבתי">
                <Heart className={cn("size-4", p.liked ? "fill-pink-400 text-pink-400" : "text-dim")} />
              </button>
              <button className="min-w-0 flex-1 text-right" onClick={() => setEditing(p)}>
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-dim">
                  {CAT_LABEL[p.category]} · {{ morning: "בוקר", evening: "ערב", both: "בוקר וערב" }[p.use]}
                </div>
              </button>
              <button onClick={() => remove(p.id)} className="text-dim hover:text-danger" aria-label="מחיקה">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Droplets className="size-5" />} title="אין מוצרים עדיין" text="הוסיפו את המוצרים שכבר יש לכם — השגרה תתבסס עליהם במקום לקנות חדשים." />
      )}
      <p className="mt-3 text-xs text-dim">לב מסמן מוצרים שאהבת. הם מופיעים גם בדשבורד.</p>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ? "עריכת מוצר" : "מוצר חדש"}>
        {editing && (
          <div className="space-y-4">
            <Field label="שם המוצר">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={80} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="קטגוריה">
                <Select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Product["category"] })}>
                  {Object.entries(CAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="מתי">
                <Select value={editing.use} onChange={(e) => setEditing({ ...editing, use: e.target.value as Product["use"] })}>
                  <option value="morning">בוקר</option>
                  <option value="evening">ערב</option>
                  <option value="both">בוקר וערב</option>
                </Select>
              </Field>
            </div>
            <Field label="הערות">
              <Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} maxLength={300} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.liked} onChange={(e) => setEditing({ ...editing, liked: e.target.checked })} /> אהבתי את המוצר
            </label>
            <Button
              className="w-full"
              disabled={!editing.name.trim()}
              onClick={() => {
                upsert({ ...editing, name: editing.name.trim() });
                setEditing(null);
              }}
            >
              שמירה
            </Button>
          </div>
        )}
      </Modal>
    </Card>
  );
}
