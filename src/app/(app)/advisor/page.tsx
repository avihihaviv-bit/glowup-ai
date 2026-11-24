"use client";
import { useMemo, useState } from "react";
import { WandSparkles, SprayCan, Wind, Droplets, Scissors, ShowerHead, Smile, Heart, ThumbsDown, Sparkles, Trash2, History, Package, Lightbulb, FlaskConical, Ban } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAIStatus, postJSON, profileContext } from "@/lib/api";
import { CAT_BY_ID, CATEGORIES, OCCASION_LABEL, SEASON_LABEL, INTENSITY_LABEL, BUDGET_LABEL, type AdvisorCat, type Budget, type Intensity, type Occasion, type Season } from "@/data/advisor";
import { emptyPref, optionsFromText, parseText, parsedLabels, ownedSummary, requestText, ruleAdvice, type Advice, type AdvisorPref } from "@/lib/advisor";
import type { AdviceAI } from "@/lib/schemas";
import { cn, dateKey, heDate, uid } from "@/lib/utils";
import { Badge, Button, Card, Chip, ErrorBox, Field, PageHeader, SectionTitle, Segmented, Select, Spinner, Textarea } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";

const ICONS: Record<AdvisorCat, typeof SprayCan> = { fragrance: SprayCan, deodorant: Wind, skin: Droplets, hair: Scissors, body: ShowerHead, oral: Smile };
const KIND: Record<Advice["picks"][number]["kind"], { label: string; tone: "green" | "accent" | "default" }> = {
  owned: { label: "כבר יש לך", tone: "green" },
  type: { label: "מה לחפש", tone: "accent" },
  example: { label: "דוגמה לבדיקה", tone: "default" },
};

export default function AdvisorPage() {
  const ai = useAIStatus();
  const cat = useStore((s) => s.advisorCat);
  const setCat = useStore((s) => s.setAdvisorCat);
  const prefs = useStore((s) => s.advisorPrefs);
  const setPref = useStore((s) => s.setAdvisorPref);
  const history = useStore((s) => s.adviceHistory);
  const addAdvice = useStore((s) => s.addAdvice);
  const removeAdvice = useStore((s) => s.removeAdvice);
  const fragrances = useStore((s) => s.fragrances);
  const products = useStore((s) => s.products);
  const scanned = useStore((s) => s.scannedProducts);

  const def = CAT_BY_ID[cat];
  const pref = prefs[cat] ?? emptyPref();
  const update = (patch: Partial<AdvisorPref>) => setPref(cat, { ...pref, ...patch });
  const detected = useMemo(() => optionsFromText(cat, pref.love), [cat, pref.love]);
  const understood = useMemo(() => parsedLabels(parseText(pref.love)), [pref.love]);
  const catHistory = useMemo(() => history.filter((h) => h.cat === cat), [history, cat]);

  const [result, setResult] = useState<{ cat: AdvisorCat; advice: Advice } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shown = result && result.cat === cat ? result.advice : null;

  function toggle(list: "likes" | "avoid", id: string) {
    const other = list === "likes" ? "avoid" : "likes";
    const on = pref[list].includes(id);
    update({ [list]: on ? pref[list].filter((x) => x !== id) : [...pref[list], id], [other]: pref[other].filter((x) => x !== id) } as Partial<AdvisorPref>);
  }

  async function ask() {
    setErr(null);
    const ctx = { fragrances, products, scanned };
    let advice: Advice;
    if (ai.aiEnabled) {
      setBusy(true);
      try {
        const lab = (id: string) => def.options.find((o) => o.id === id)?.label ?? id;
        const res = await postJSON<{ advice: AdviceAI }>("/api/advisor", {
          category: cat,
          likes: pref.likes.map(lab),
          avoid: pref.avoid.map(lab),
          love: pref.love,
          intensity: pref.intensity ? INTENSITY_LABEL[pref.intensity] : undefined,
          occasion: pref.occasion ? OCCASION_LABEL[pref.occasion] : undefined,
          season: pref.season ? SEASON_LABEL[pref.season] : undefined,
          budget: BUDGET_LABEL[pref.budget],
          owned: ownedSummary(cat, ctx).slice(0, 40),
          profile: profileContext(useStore.getState().profile),
        });
        advice = { ...res.advice, source: "ai" };
      } catch (e) {
        setErr(`${(e as Error).message} מוצגת עצה מבוססת כללים במקום.`);
        advice = ruleAdvice(cat, pref, ctx);
      } finally {
        setBusy(false);
      }
    } else {
      advice = ruleAdvice(cat, pref, ctx);
    }
    setResult({ cat, advice });
    addAdvice({ id: uid("adv"), date: dateKey(), cat, request: requestText(cat, pref), advice });
    requestAnimationFrame(() => document.getElementById("advice-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="יועץ מוצרים ובשמים" subtitle="כותבים מה אוהבים, ומקבלים עצה מה הכי מתאים לבקשה. ההעדפות נשמרות לכל קטגוריה." icon={<WandSparkles className="size-5" />} />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="tablist" aria-label="קטגוריה">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.id];
          const on = c.id === cat;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={on}
              onClick={() => setCat(c.id)}
              className={cn("flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition", on ? "border-accent bg-accent text-white shadow-[0_8px_24px_-12px_var(--accent)]" : "border-line bg-white text-fg hover:border-accent/40")}
            >
              <Icon className="size-5" />
              <span className="text-sm font-semibold">{c.title}</span>
              <span className={cn("hidden text-[11px] sm:block", on ? "text-white/80" : "text-dim")}>{c.subtitle}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="space-y-5 lg:col-span-3">
          <SectionTitle>מה אתה אוהב ב{def.title}?</SectionTitle>
          <Field label="במילים שלך: מה הכי חשוב לך" hint="אפשר לכתוב חופשי. מילים כמו ״וניל״, ״הדרים״ או ״בלי ריח״ מזוהות אוטומטית.">
            <Textarea id="adv-love" value={pref.love} onChange={(e) => update({ love: e.target.value })} placeholder={def.lovePlaceholder} maxLength={1500} />
          </Field>
          {detected.length + understood.length > 0 && (
            <p className="-mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3.5 text-accent" /> זוהה מהטקסט:
              {detected.map((id) => (
                <Badge key={id} tone="accent">{def.options.find((o) => o.id === id)?.label}</Badge>
              ))}
              {understood.map((l) => (
                <Badge key={l}>{l}</Badge>
              ))}
            </p>
          )}

          <Field label="אוהב">
            <div className="flex flex-wrap gap-2">
              {def.options.map((o) => (
                <Chip key={o.id} active={pref.likes.includes(o.id)} onClick={() => toggle("likes", o.id)}>
                  {pref.likes.includes(o.id) && <Heart className="me-1 inline size-3.5 fill-current" />}
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="לא אוהב / להימנע">
            <div className="flex flex-wrap gap-2">
              {def.options.map((o) => (
                <Chip key={o.id} active={pref.avoid.includes(o.id)} onClick={() => toggle("avoid", o.id)} className={pref.avoid.includes(o.id) ? "!border-danger/50 !bg-danger/10 !text-danger" : ""}>
                  {pref.avoid.includes(o.id) && <ThumbsDown className="me-1 inline size-3.5" />}
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          {def.hasIntensity && (
            <Field label="עוצמה">
              <Segmented<Intensity | "">
                value={pref.intensity ?? ""}
                onChange={(v) => update({ intensity: v || undefined })}
                options={[{ value: "", label: "לא משנה" }, ...(Object.keys(INTENSITY_LABEL) as Intensity[]).map((k) => ({ value: k, label: INTENSITY_LABEL[k] }))]}
              />
            </Field>
          )}

          {(def.hasOccasion || def.hasSeason) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {def.hasOccasion && (
                <Field label="לאיזה אירוע">
                  <Select id="adv-occasion" value={pref.occasion ?? ""} onChange={(e) => update({ occasion: (e.target.value || undefined) as Occasion | undefined })}>
                    <option value="">לא משנה</option>
                    {(Object.keys(OCCASION_LABEL) as Occasion[]).map((k) => (
                      <option key={k} value={k}>{OCCASION_LABEL[k]}</option>
                    ))}
                  </Select>
                </Field>
              )}
              {def.hasSeason && (
                <Field label="עונה">
                  <Select id="adv-season" value={pref.season ?? ""} onChange={(e) => update({ season: (e.target.value || undefined) as Season | undefined })}>
                    <option value="">לא משנה</option>
                    {(Object.keys(SEASON_LABEL) as Season[]).map((k) => (
                      <option key={k} value={k}>{SEASON_LABEL[k]}</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}

          <Field label="תקציב">
            <Segmented<Budget> value={pref.budget} onChange={(v) => update({ budget: v })} options={(Object.keys(BUDGET_LABEL) as Budget[]).map((k) => ({ value: k, label: BUDGET_LABEL[k] }))} />
          </Field>

          <div className="space-y-2">
            <Button size="lg" className="w-full" icon={<WandSparkles className="size-4" />} loading={busy} onClick={ask}>
              מה הכי מתאים לי?
            </Button>
            {!ai.loading && (
              <p className="text-center text-xs text-dim">
                {ai.aiEnabled ? "העצה נכתבת על ידי AI לפי ההעדפות שלך והמוצרים ששמרת." : "מצב דמו: העצה מבוססת על מאגר ידע מובנה ועל המוצרים ששמרת. עם ANTHROPIC_API_KEY העצה תהיה אישית יותר."}
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <SectionTitle>
              <span className="flex items-center gap-2"><Lightbulb className="size-4 text-accent" /> טיפים כלליים: {def.title}</span>
            </SectionTitle>
            <ul className="space-y-2 text-sm text-muted">
              {def.general.map((g) => (
                <li key={g} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{g}</li>
              ))}
            </ul>
            <SourceLinks keys={def.sources} />
          </Card>
          {cat === "fragrance" && (
            <Card className="p-4 text-sm text-muted">
              יש לך <b className="text-fg">{fragrances.length}</b> בשמים באוסף. ככל שתרשום בכל בושם משפחה והערות (למשל ״וניל, מתוק״), היועץ ימליץ גם מתוך מה שכבר יש לך.
            </Card>
          )}
        </div>
      </div>

      <div id="advice-result" className="scroll-mt-24">
        {busy && <Spinner label="חושבים מה הכי מתאים לך…" />}
        {err && <ErrorBox message={err} />}
        {shown && !busy && <AdviceView advice={shown} />}
      </div>

      {catHistory.length > 0 && (
        <Card>
          <SectionTitle>
            <span className="flex items-center gap-2"><History className="size-4 text-accent" /> עצות קודמות</span>
          </SectionTitle>
          <ul className="divide-y divide-line">
            {catHistory.slice(0, 10).map((h) => (
              <li key={h.id} className="flex items-center gap-2 py-2.5">
                <button className="min-w-0 flex-1 text-start" onClick={() => setResult({ cat: h.cat, advice: h.advice })}>
                  <div className="truncate text-sm font-medium">{h.request}</div>
                  <div className="text-xs text-dim">{heDate(h.date)} · {h.advice.source === "ai" ? "AI" : "מבוסס כללים"}</div>
                </button>
                <button onClick={() => removeAdvice(h.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function AdviceView({ advice }: { advice: Advice }) {
  const groups = (["owned", "type", "example"] as const).map((k) => ({ k, items: advice.picks.filter((p) => p.kind === k) })).filter((g) => g.items.length);
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-white to-accent-soft">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle>העצה שלי</SectionTitle>
          <Badge tone={advice.source === "ai" ? "accent" : "default"}>{advice.source === "ai" ? "AI" : "מבוסס כללים"}</Badge>
        </div>
        <p className="leading-7">{advice.summary}</p>
        {advice.lookFor.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold text-muted">מה לחפש</div>
            <div className="flex flex-wrap gap-1.5">
              {advice.lookFor.map((l) => (
                <span key={l} className="rounded-full bg-white px-3 py-1 text-sm text-accent-strong shadow-sm">{l}</span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {groups.map((g) => (
        <div key={g.k}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {g.k === "owned" ? <Package className="size-4 text-green" /> : g.k === "type" ? <Sparkles className="size-4 text-accent" /> : <FlaskConical className="size-4 text-muted" />}
            {g.k === "owned" ? "מהמוצרים שלך" : g.k === "type" ? "ההמלצות שלי" : "דוגמאות מוכרות לבדיקה"}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((p, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{p.title}</div>
                  <Badge tone={KIND[p.kind].tone} className="shrink-0 whitespace-nowrap">{KIND[p.kind].label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{p.why}</p>
                {p.how && <p className="mt-1.5 text-sm text-accent-strong">{p.how}</p>}
              </Card>
            ))}
          </div>
          {g.k === "example" && <p className="mt-2 text-xs text-dim">לא חסות ולא פרסום. כדאי להריח על העור או לקנות דוגמית לפני בקבוק מלא. לא מוצגים מחירים.</p>}
        </div>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        {advice.avoid.length > 0 && (
          <Card>
            <SectionTitle><span className="flex items-center gap-2"><Ban className="size-4 text-warn" /> שימו לב</span></SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted">{advice.avoid.map((a) => <li key={a}>• {a}</li>)}</ul>
          </Card>
        )}
        {advice.testing.length > 0 && (
          <Card>
            <SectionTitle><span className="flex items-center gap-2"><FlaskConical className="size-4 text-accent" /> איך לבדוק לפני קנייה</span></SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted">{advice.testing.map((a) => <li key={a}>• {a}</li>)}</ul>
          </Card>
        )}
      </div>
      {advice.source === "ai" && advice.general.length > 0 && (
        <Card>
          <SectionTitle>בכללי</SectionTitle>
          <ul className="space-y-1.5 text-sm text-muted">{advice.general.map((a) => <li key={a}>• {a}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
