"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Globe, ShieldCheck, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Budget, Concern, ConcernCategory, Gender, Goal, GrowthSex, Lifestyle, Profile, Units } from "@/lib/types";
import { createPlan } from "@/lib/planActions";
import { saveImage } from "@/lib/images";
import { useT, useLang } from "@/lib/i18n";
import { analyzeConcernById, newConcern } from "@/lib/concernActions";
import { Button, Card, Chip, Field, Input, Modal, Select } from "@/components/ui";
import { ConcernForm } from "@/components/ConcernForm";
import { cn, uid } from "@/lib/utils";

const GOALS: { id: Goal; emoji: string }[] = [
  { id: "grooming", emoji: "🪒" },
  { id: "haircut", emoji: "💇" },
  { id: "skin", emoji: "🧴" },
  { id: "hairHealth", emoji: "🌿" },
  { id: "muscle", emoji: "💪" },
  { id: "posture", emoji: "🧍" },
  { id: "growth", emoji: "📏" },
  { id: "sleep", emoji: "😴" },
  { id: "nutrition", emoji: "🥗" },
  { id: "puffiness", emoji: "💧" },
  { id: "style", emoji: "👕" },
  { id: "confidence", emoji: "✨" },
];

const SCANS = [
  { id: "face", href: "/face", ready: true },
  { id: "hair", href: "/hair", ready: true },
  { id: "skin", href: "/skin", ready: true },
  { id: "posture", href: "/fitness", ready: true },
  { id: "body", href: "/fitness", ready: false },
] as const;

/** Exact age (years + months) from a yyyy-mm-dd date of birth. */
export function exactAge(dob: string, now = new Date()) {
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return null;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months -= 1;
  if (months < 0) return null;
  return { years: Math.floor(months / 12), months: months % 12 };
}

const IN_TO_CM = 2.54;

export default function Onboarding() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const existing = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const setPlan = useStore((s) => s.setPlan);
  const setLang = useStore((s) => s.setLang);
  const addConcern = useStore((s) => s.addConcern);
  const importData = useStore((s) => s.importData);
  const theme = useStore((s) => s.theme);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [country, setCountry] = useState("");
  const [growthSex, setGrowthSex] = useState<GrowthSex>("");
  const [gender, setGender] = useState<Gender>("");
  const [goals, setGoals] = useState<Goal[]>(["skin", "muscle", "sleep"]);
  const [drafts, setDrafts] = useState<{ id: string; title: string; description: string; category: ConcernCategory; photo: Blob | null }[]>([]);
  const [life, setLife] = useState<Lifestyle>({});
  const [scans, setScans] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ label: string; done: boolean }[]>([]);
  const [note, setNote] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (mounted && existing && !busy) router.replace("/");
  }, [mounted, existing, router, busy]);

  const age = dob ? exactAge(dob) : null;
  const dobValid = !!age && age.years >= 10 && age.years <= 100;
  const canNext = step === 1 ? name.trim().length > 0 && dobValid : step === 2 ? goals.length > 0 : true;
  const labels = ["welcome", "personal", "goals", "concerns", "life", "scan", "plan"];

  const setL = <K extends keyof Lifestyle>(k: K, v: Lifestyle[K]) => setLife((x) => ({ ...x, [k]: v }));
  const toggle = (arr: string[] | undefined, v: string) => ((arr ?? []).includes(v) ? (arr ?? []).filter((x) => x !== v) : [...(arr ?? []), v]);

  async function restore(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data?.profile?.name) throw new Error();
      const keys = ["profile", "plan", "completions", "customTasks", "checkins", "workouts", "analyses", "favorites", "haircuts", "products", "photos", "coach", "manualFaceShape", "concerns", "priorityPins", "lang"];
      const clean: Record<string, unknown> = {};
      for (const k of keys) if (k in data) clean[k] = data[k];
      importData(clean);
      setLoginMsg(t("ob.login.ok"));
    } catch {
      setLoginMsg(t("ob.login.bad"));
    }
  }

  async function finish() {
    setBusy(true);
    setStep(6);
    const raw = parseFloat(heightInput.replace(",", "."));
    const heightCm = Number.isFinite(raw) && raw > 0 ? Math.round((units === "metric" ? raw : raw * IN_TO_CM) * 10) / 10 : undefined;
    const exp = life.gymExperience;
    const profile: Profile = {
      name: name.trim(),
      age: age?.years ?? 25,
      dob,
      heightCm: heightCm && heightCm >= 50 && heightCm <= 260 ? heightCm : undefined,
      units,
      country: country.trim() || undefined,
      growthSex,
      gender,
      goals,
      minutesPerDay: 30,
      budget: "low" as Budget,
      skinType: "unknown",
      fitnessLevel: exp === "advanced" ? "advanced" : exp === "intermediate" ? "intermediate" : "beginner",
      lifestyle: life,
      createdAt: new Date().toISOString(),
    };

    // 1) save concerns (photos stay on-device) and analyze each separately
    const created: Concern[] = [];
    for (const d of drafts) {
      const imageId = d.photo ? await saveImage(d.photo) : undefined;
      const c = newConcern({ title: d.title, description: d.description, category: d.category, imageId }, d.id);
      created.push(c);
    }
    setProfile(profile);
    created.forEach(addConcern);
    setProgress(created.map((c) => ({ label: c.title, done: false })));
    for (let i = 0; i < created.length; i++) {
      try {
        await analyzeConcernById(created[i].id, { sendImage: !!created[i].imageId });
      } catch {
        /* stays un-analyzed; retry is available on the My Concerns page */
      }
      setProgress((p) => p.map((x, j) => (j === i ? { ...x, done: true } : x)));
    }

    // 2) plan from real inputs only
    const { plan, aiError } = await createPlan(profile);
    if (aiError) setNote(aiError);
    setPlan(plan);
    await new Promise((r) => setTimeout(r, aiError ? 2200 : 500));
    const first = SCANS.find((s) => scans.includes(s.id) && s.ready);
    router.replace(first ? first.href : "/");
  }

  if (!mounted) return null;

  const ArrowNext = lang === "he" ? ArrowLeft : ArrowRight;
  const ArrowPrev = lang === "he" ? ArrowRight : ArrowLeft;

  return (
    <div className="glow-bg flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="mb-6 flex w-full max-w-xl items-center justify-between">
        <div className="flex items-center gap-2.5" dir="ltr">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-green text-black">
            <Sparkles className="size-5" />
          </div>
          <span className="text-xl font-extrabold tracking-wide">
            GLOWUP <span className="text-gradient">AI</span>
          </span>
        </div>
        <button
          onClick={() => setLang(lang === "he" ? "en" : "he")}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm text-muted hover:text-fg"
         
        >
          <Globe className="size-4" /> {lang === "he" ? "English" : "עברית"}
        </button>
      </div>

      <div className="mb-6 flex w-full max-w-xl gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemax={labels.length}>
        {labels.map((s, i) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full transition", i <= step ? "bg-accent" : "bg-surface-3")} />
        ))}
      </div>

      <Card className="w-full max-w-xl p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: lang === "he" ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {step === 0 && (
              <div className="text-center">
                <h1 className="text-3xl font-bold leading-tight text-balance sm:text-4xl">
                  <span className="text-gradient">{t("ob.welcome.title")}</span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-muted">{t("ob.welcome.sub")}</p>
                <div className="mt-8 flex flex-col gap-3">
                  <Button size="lg" onClick={() => setStep(1)}>
                    {t("ob.welcome.start")}
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => setLoginOpen(true)}>
                    {t("ob.welcome.login")}
                  </Button>
                </div>
                <p className="mt-6 text-xs text-dim">{t("ob.welcome.note")}</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">{t("ob.personal.title")}</h2>
                <Field label={t("ob.personal.name")}>
                  <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("ob.personal.namePh")} maxLength={40} autoFocus />
                </Field>
                <Field label={t("ob.personal.dob")}>
                  <Input id="ob-dob" type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
                </Field>
                {dob && (
                  <p className={cn("-mt-2 text-sm", dobValid ? "text-green" : "text-danger")} aria-live="polite">
                    {dobValid && age
                      ? `${t("ob.personal.age")}: ${age.years} ${t("ob.personal.years")} ${age.months} ${t("ob.personal.months")}`
                      : t("ob.personal.dobError")}
                  </p>
                )}
                {dobValid && age && age.years < 18 && <p className="rounded-xl bg-green-soft p-3 text-sm text-green">{t("ob.minor")}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <Field label={`${t("ob.personal.height")} (${units === "metric" ? "cm" : "in"})`} hint={t("ob.personal.heightHint")}>
                    <Input id="ob-height" inputMode="decimal" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} placeholder={units === "metric" ? "175" : "69"} />
                  </Field>
                  <Field label={t("ob.personal.country")}>
                    <Input id="ob-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("ob.personal.countryPh")} maxLength={40} />
                  </Field>
                </div>
                <Field label={t("ob.personal.units")}>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={units === "metric"} onClick={() => setUnits("metric")}>
                      {t("ob.personal.metric")}
                    </Chip>
                    <Chip active={units === "imperial"} onClick={() => setUnits("imperial")}>
                      {t("ob.personal.imperial")}
                    </Chip>
                  </div>
                </Field>
                <Field label={t("ob.personal.language")}>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={lang === "he"} onClick={() => setLang("he")}>
                      עברית
                    </Chip>
                    <Chip active={lang === "en"} onClick={() => setLang("en")}>
                      English
                    </Chip>
                  </div>
                </Field>
                <Field label={t("ob.personal.gender")}>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["male", "ob.personal.male"],
                        ["female", "ob.personal.female"],
                        ["other", "ob.personal.other"],
                        ["", "ob.personal.skipSex"],
                      ] as [Gender, string][]
                    ).map(([v, k]) => (
                      <Chip key={k} active={gender === v} onClick={() => setGender(v)}>
                        {t(k)}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label={t("ob.personal.growthSex")} hint={t("ob.personal.growthWhy")}>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["male", "ob.personal.boys"],
                        ["female", "ob.personal.girls"],
                        ["", "ob.personal.skipSex"],
                      ] as [GrowthSex, string][]
                    ).map(([v, k]) => (
                      <Chip key={k} active={growthSex === v} onClick={() => setGrowthSex(v)}>
                        {t(k)}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t("ob.goals.title")}</h2>
                <p className="text-sm text-muted">{t("ob.goals.sub")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => {
                    const active = goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGoals(active ? goals.filter((x) => x !== g.id) : [...goals, g.id])}
                        aria-pressed={active}
                        className={cn(
                          "relative flex min-h-20 flex-col items-start gap-1 rounded-xl border p-3 text-start transition",
                          active ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong",
                        )}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <span className="text-sm font-medium">{t(`goal.${g.id}`)}</span>
                        {active && <Check className="absolute end-2 top-2 size-4 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t("ob.concerns.title")}</h2>
                <p className="text-sm text-muted">{t("ob.concerns.sub")}</p>
                <ConcernForm
                  compact
                  submitLabel={t("ob.concerns.add")}
                  onSubmit={(d) => setDrafts((x) => [...x, { id: uid("cn"), title: d.title, description: d.description, category: d.category, photo: d.photo }])}
                />
                {drafts.length > 0 ? (
                  <div>
                    <div className="mb-2 text-sm font-medium">{t("ob.concerns.added")}</div>
                    <ul className="space-y-2">
                      {drafts.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
                          <span className="min-w-0">
                            <b className="block truncate">{d.title}</b>
                            <span className="text-xs text-dim">{t(`cat.${d.category}`)}</span>
                          </span>
                          <button onClick={() => setDrafts((x) => x.filter((y) => y.id !== d.id))} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label={t("common.delete")}>
                            <Trash2 className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-dim">{t("ob.concerns.empty")}</p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-dim">
                  <ShieldCheck className="size-3.5 text-green" /> {t("ob.concerns.privacy")}
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">{t("ob.life.title")}</h2>
                <p className="text-sm text-muted">{t("ob.life.sub")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("ob.life.sleep")}>
                    <Input id="life-sleep" type="number" min={3} max={14} step={0.5} value={life.sleepHours ?? ""} onChange={(e) => setL("sleepHours", e.target.value ? Number(e.target.value) : undefined)} />
                  </Field>
                  <Field label={t("ob.life.water")}>
                    <Input id="life-water" type="number" min={0} max={20} value={life.waterGlasses ?? ""} onChange={(e) => setL("waterGlasses", e.target.value ? Number(e.target.value) : undefined)} />
                  </Field>
                  <Field label={t("ob.life.bed")}>
                    <Input id="life-bed" type="time" value={life.bedtime ?? ""} onChange={(e) => setL("bedtime", e.target.value || undefined)} />
                  </Field>
                  <Field label={t("ob.life.wake")}>
                    <Input id="life-wake" type="time" value={life.wakeTime ?? ""} onChange={(e) => setL("wakeTime", e.target.value || undefined)} />
                  </Field>
                  <Field label={t("ob.life.exercise")}>
                    <Select id="life-ex" value={life.exerciseDays ?? ""} onChange={(e) => setL("exerciseDays", e.target.value === "" ? undefined : Number(e.target.value))}>
                      <option value="">-</option>
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label={t("ob.life.gym")}>
                  <div className="flex flex-wrap gap-2">
                    {(["none", "beginner", "intermediate", "advanced"] as const).map((g) => (
                      <Chip key={g} active={life.gymExperience === g} onClick={() => setL("gymExperience", life.gymExperience === g ? undefined : g)}>
                        {t(`ob.life.gym.${g}`)}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label={t("ob.life.equipment")}>
                  <div className="flex flex-wrap gap-2">
                    {["none", "dumbbells", "bands", "bar", "gym"].map((g) => (
                      <Chip key={g} active={(life.equipment ?? []).includes(g)} onClick={() => setL("equipment", toggle(life.equipment, g))}>
                        {t(`ob.life.eq.${g}`)}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label={t("ob.life.hair")}>
                  <Input id="life-hair" value={life.hairWash ?? ""} onChange={(e) => setL("hairWash", e.target.value || undefined)} placeholder={t("ob.life.hairPh")} maxLength={120} />
                </Field>
                <Field label={t("ob.life.skin")}>
                  <Input id="life-skin" value={life.skinRoutine ?? ""} onChange={(e) => setL("skinRoutine", e.target.value || undefined)} placeholder={t("ob.life.skinPh")} maxLength={160} />
                </Field>
                <Field label={t("ob.life.diet")}>
                  <div className="flex flex-wrap gap-2">
                    {["vegetarian", "vegan", "kosher", "glutenFree", "dairyFree"].map((g) => (
                      <Chip key={g} active={(life.diet ?? []).includes(g)} onClick={() => setL("diet", toggle(life.diet, g))}>
                        {t(`ob.life.diet.${g}`)}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label={t("ob.life.restrictions")}>
                  <Input id="life-restr" value={life.restrictions ?? ""} onChange={(e) => setL("restrictions", e.target.value || undefined)} maxLength={200} />
                </Field>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{t("ob.scan.title")}</h2>
                <p className="text-sm text-muted">{t("ob.scan.sub")}</p>
                <div className="grid gap-2">
                  {SCANS.map((s) => {
                    const on = scans.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        disabled={!s.ready}
                        onClick={() => setScans(on ? scans.filter((x) => x !== s.id) : [...scans, s.id])}
                        aria-pressed={on}
                        className={cn(
                          "flex min-h-14 items-center justify-between rounded-xl border p-3 text-start transition disabled:opacity-50",
                          on ? "border-accent bg-accent-soft" : "border-line bg-surface-2",
                        )}
                      >
                        <span className="font-medium">{t(`ob.scan.${s.id}`)}</span>
                        <span className="text-xs text-muted">{!s.ready ? t("ob.scan.available") : on ? <Check className="size-4 text-accent" /> : t("ob.scan.later")}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                  <div className="mb-1 font-medium">{t("ob.scan.how")}</div>
                  <p className="text-muted">{t("ob.scan.tips")}</p>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="flex flex-col items-center py-6 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-accent to-green text-black">
                  <Wand2 className="size-7" />
                </motion.div>
                <h2 className="mt-5 text-xl font-semibold">{t("ob.plan.title")}</h2>
                <p className="mt-2 max-w-sm text-sm text-muted">{t("ob.plan.sub")}</p>
                {progress.length > 0 && (
                  <ul className="mt-4 w-full space-y-1.5 text-start text-sm">
                    {progress.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted">
                        {p.done ? <Check className="size-4 text-green" /> : <span className="size-4 animate-pulse rounded-full bg-accent/40" />}
                        <span className="truncate">{p.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {note && <p className="mt-4 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">{note}</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && step < 6 && (
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" icon={<ArrowPrev className="size-4" />} onClick={() => setStep((s) => s - 1)}>
              {t("common.back")}
            </Button>
            <div className="flex gap-2">
              {(step === 3 || step === 4 || step === 5) && step < 5 && (
                <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
                  {t("common.skip")}
                </Button>
              )}
              {step < 5 ? (
                <Button size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                  {t("common.next")} <ArrowNext className="size-4" />
                </Button>
              ) : (
                <Button size="lg" loading={busy} onClick={finish} icon={<Sparkles className="size-4" />}>
                  {t("ob.finish")}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <p className="mt-6 flex max-w-xl items-center gap-1.5 text-center text-xs text-dim">
        <ShieldCheck className="size-3.5 shrink-0 text-green" /> {t("ob.consent")}
      </p>

      <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title={t("ob.login.title")}>
        <p className="text-sm text-muted">{t("ob.login.body")}</p>
        <Button className="mt-4 w-full" variant="secondary" onClick={() => fileRef.current?.click()}>
          {t("ob.login.restore")}
        </Button>
        {loginMsg && <p className="mt-3 text-sm text-accent">{loginMsg}</p>}
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => (restore(e.target.files?.[0]), (e.target.value = ""))} />
      </Modal>
    </div>
  );
}
