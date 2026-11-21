"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Budget, Gender, Goal, Profile, SkinType } from "@/lib/types";
import { GOAL_LABELS } from "@/lib/plan";
import { createPlan } from "@/lib/planActions";
import { saveImage } from "@/lib/images";
import { useAIStatus } from "@/lib/api";
import { Button, Card, Chip, Field, Input } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";
import { cn } from "@/lib/utils";

const GOAL_EMOJI: Record<Goal, string> = { skin: "🧴", hair: "💇", style: "👕", fitness: "💪", posture: "🧍", sleep: "😴", confidence: "✨" };

export default function Onboarding() {
  const router = useRouter();
  const existing = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const setPlan = useStore((s) => s.setPlan);
  const theme = useStore((s) => s.theme);
  const ai = useAIStatus();
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [p, setP] = useState<Omit<Profile, "createdAt">>({
    name: "",
    age: 25,
    gender: "",
    goals: ["skin", "fitness", "sleep"],
    minutesPerDay: 30,
    budget: "low",
    skinType: "unknown",
    fitnessLevel: "beginner",
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (mounted && existing && !busy) router.replace("/");
  }, [mounted, existing, router, busy]);

  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((s) => ({ ...s, [k]: v }));
  const steps = ["ברוכים הבאים", "קצת עליך", "מטרות", "העדפות", "תמונת פרופיל", "התוכנית שלך"];
  const canNext = step === 1 ? p.name.trim().length > 0 && p.age >= 10 && p.age <= 100 : step === 2 ? p.goals.length > 0 : true;

  async function finish() {
    setBusy(true);
    setStep(5);
    const avatarImageId = photo ? await saveImage(photo) : undefined;
    const profile: Profile = { ...p, name: p.name.trim(), avatarImageId, createdAt: new Date().toISOString() };
    const { plan, aiError } = await createPlan(profile);
    if (aiError) setNote(`לא הצלחנו ליצור תוכנית AI (${aiError}). נוצרה תוכנית דמו — אפשר ליצור מחדש בעמוד התוכנית.`);
    setPlan(plan);
    setProfile(profile);
    await new Promise((r) => setTimeout(r, aiError ? 2500 : 600));
    router.replace("/");
  }

  if (!mounted) return null;

  return (
    <div className="glow-bg flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="mb-6 flex items-center gap-2.5" dir="ltr">
        <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-green text-black">
          <Sparkles className="size-5" />
        </div>
        <span className="text-xl font-extrabold tracking-wide">
          GLOWUP <span className="text-gradient">AI</span>
        </span>
      </div>

      <div className="mb-6 flex w-full max-w-xl gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full transition", i <= step ? "bg-accent" : "bg-surface-3")} />
        ))}
      </div>

      <Card className="w-full max-w-xl p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            {step === 0 && (
              <div className="text-center">
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                  ה-Glow Up שלך <span className="text-gradient">מתחיל כאן</span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-muted">
                  מאמן אישי לטיפוח, שיער, סטייל, יציבה וכושר. נבנה יחד תוכנית של 30 יום — הדרגתית, מציאותית ומותאמת לך.
                </p>
                <div className="mt-6 grid gap-3 text-right sm:grid-cols-3">
                  {[
                    ["🎯", "תוכנית 30 יום", "משימות יומיות קצרות וברורות"],
                    ["📸", "ניתוח תמונות", "פנים, שיער וסטייל"],
                    ["🔒", "פרטיות מלאה", "התמונות נשמרות רק אצלך"],
                  ].map(([e, t, d]) => (
                    <div key={t} className="rounded-xl border border-line bg-surface-2 p-3">
                      <div className="text-xl">{e}</div>
                      <div className="mt-1 text-sm font-medium">{t}</div>
                      <div className="text-xs text-muted">{d}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs text-dim">
                  GLOWUP AI לא נותן ציוני יופי או אטרקטיביות — רק המלצות מעשיות והרגלים בריאים.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">קצת עליך</h2>
                <Field label="איך לקרוא לך?">
                  <Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="השם שלך" maxLength={40} autoFocus />
                </Field>
                <Field label="גיל" hint="משמש להתאמת המלצות כושר ותזונה בצורה בטוחה">
                  <Input type="number" min={10} max={100} value={p.age} onChange={(e) => set("age", Number(e.target.value))} />
                </Field>
                <Field label="להתאמת המלצות שיער וסטייל (אופציונלי)">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["male", "גבר"],
                      ["female", "אישה"],
                      ["other", "אחר"],
                      ["", "מעדיף/ה לא לציין"],
                    ] as [Gender, string][]).map(([v, l]) => (
                      <Chip key={l} active={p.gender === v} onClick={() => set("gender", v)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">על מה רוצים לעבוד?</h2>
                <p className="text-sm text-muted">בחרו כמה שרוצים — התוכנית תתמקד בהם.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => {
                    const active = p.goals.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => set("goals", active ? p.goals.filter((x) => x !== g) : [...p.goals, g])}
                        className={cn(
                          "relative flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition",
                          active ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong",
                        )}
                      >
                        <span className="text-2xl">{GOAL_EMOJI[g]}</span>
                        <span className="text-sm font-medium">{GOAL_LABELS[g]}</span>
                        {active && <Check className="absolute left-2 top-2 size-4 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">העדפות</h2>
                <Field label={`כמה זמן ביום יש לך? ${p.minutesPerDay} דקות`}>
                  <input type="range" min={10} max={90} step={5} value={p.minutesPerDay} onChange={(e) => set("minutesPerDay", Number(e.target.value))} className="w-full" />
                </Field>
                <Field label="תקציב למוצרים">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["low", "חסכוני"],
                      ["medium", "בינוני"],
                      ["high", "גמיש"],
                    ] as [Budget, string][]).map(([v, l]) => (
                      <Chip key={v} active={p.budget === v} onClick={() => set("budget", v)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="סוג עור (לפי ההרגשה שלך)">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["oily", "שמנוני"],
                      ["dry", "יבש"],
                      ["combination", "מעורב"],
                      ["normal", "רגיל"],
                      ["sensitive", "רגיש"],
                      ["unknown", "לא יודע/ת"],
                    ] as [SkinType, string][]).map(([v, l]) => (
                      <Chip key={v} active={p.skinType === v} onClick={() => set("skinType", v)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="רמת כושר">
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["beginner", "מתחיל/ה"],
                      ["intermediate", "בינוני"],
                      ["advanced", "מתקדם/ת"],
                    ] as [Profile["fitnessLevel"], string][]).map(([v, l]) => (
                      <Chip key={v} active={p.fitnessLevel === v} onClick={() => set("fitnessLevel", v)}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">תמונת פרופיל (אופציונלי)</h2>
                <p className="text-sm text-muted">מוצגת רק לך בדשבורד. אפשר לדלג.</p>
                <div className="mx-auto max-w-56">
                  <ImageUploader value={photo} onChange={setPhoto} hint="תמונה ריבועית עובדת הכי טוב" aspect="aspect-square" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col items-center py-6 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-accent to-green text-black"
                >
                  <Wand2 className="size-7" />
                </motion.div>
                <h2 className="mt-5 text-xl font-semibold">בונים את תוכנית 30 הימים שלך…</h2>
                <p className="mt-2 max-w-sm text-sm text-muted">
                  {ai.aiEnabled ? "ה-AI מתאים משימות, שגרות בוקר וערב לפי המטרות והזמן שלך. זה יכול לקחת עד דקה." : "מצב דמו: בונים תוכנית מתוך ספריית משימות מוכנה, לפי המטרות והזמן שבחרת."}
                </p>
                {note && <p className="mt-4 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{note}</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 5 && (
          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" icon={<ArrowRight className="size-4" />} onClick={() => setStep((s) => s - 1)}>
                חזרה
              </Button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <Button size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                {step === 0 ? "בואו נתחיל" : "המשך"} <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <Button size="lg" loading={busy} onClick={finish} icon={<Sparkles className="size-4" />}>
                {photo ? "צור את התוכנית שלי" : "דלג וצור תוכנית"}
              </Button>
            )}
          </div>
        )}
      </Card>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-dim">
        <ShieldCheck className="size-3.5 text-green" /> כל הנתונים נשמרים במכשיר שלך בלבד וניתנים למחיקה בכל רגע.
      </p>
    </div>
  );
}
