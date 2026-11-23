"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TrendingUp, Trophy, Flame, Camera, Trash2, Lock, Heart, Scissors, Dumbbell, Droplets, Plus } from "lucide-react";
import { useStore, computeStreak, computeXP, dayScore } from "@/lib/store";
import { LEVELS, levelFor, tasksForDate, XP } from "@/lib/plan";
import { saveImage } from "@/lib/images";
import { CATEGORY_META, dateKey, heDate, heDayShort, lastNDays, uid, cn } from "@/lib/utils";
import type { ProgressPhoto } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, ProgressBar, SectionTitle, Segmented, Select } from "@/components/ui";
import { StoredImage } from "@/components/StoredImage";
import { TrendArea, WeeklyBars } from "@/components/charts";
import { ImageUploader } from "@/components/ImageUploader";
import { RatingsCard } from "@/components/RatingsCard";
import { HabitHeatmap } from "@/components/HabitHeatmap";
import { WeeklyReport } from "@/components/WeeklyReport";
import { ScanHistoryCard } from "@/components/ScanHistoryCard";
import { PhotoQualityCoach } from "@/components/PhotoQualityCoach";

export default function ProgressPage() {
  const s = useStore();
  const xp = computeXP(s);
  const lvl = levelFor(xp);
  const streak = computeStreak(s);
  const [range, setRange] = useState<"7" | "30">("7");
  const days = lastNDays(Number(range));
  const habitData = days.map((d) => ({ label: range === "7" ? heDayShort(d) : heDate(d), value: dayScore(s, d).score }));
  const moodData = days.map((d) => ({ label: range === "7" ? heDayShort(d) : heDate(d), value: s.checkins[d]?.mood ?? null }));

  const categoryStats = useMemo(() => {
    const out: Record<string, { done: number; total: number }> = {};
    for (const d of lastNDays(30)) {
      if (d > dateKey()) continue;
      const done = new Set(s.completions[d] ?? []);
      for (const t of tasksForDate(s.plan, d, s.customTasks)) {
        out[t.category] ??= { done: 0, total: 0 };
        out[t.category].total++;
        if (done.has(t.id)) out[t.category].done++;
      }
    }
    return Object.entries(out).sort((a, b) => b[1].total - a[1].total);
  }, [s.completions, s.plan, s.customTasks]);

  const totalTasks = Object.values(s.completions).reduce((a, b) => a + b.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="התקדמות" subtitle="הרגלים, רצפים, XP ותמונות התקדמות פרטיות." icon={<TrendingUp className="size-5" />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan to-accent text-2xl font-black text-white">{lvl.level}</div>
            <div className="flex-1">
              <div className="text-sm text-muted">רמה {lvl.level}</div>
              <div className="text-2xl font-bold">{lvl.name}</div>
              <div className="mt-2">
                <ProgressBar value={lvl.progress * 100} />
              </div>
              <div className="mt-1 text-xs text-dim">
                {xp} XP {lvl.next ? `· עוד ${lvl.toNext} XP ל"${LEVELS[lvl.level]?.name}"` : "· הרמה הגבוהה ביותר!"}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-5">
            {[
              ["משימה", XP.task],
              ["Check-in", XP.checkin],
              ["אימון", XP.workout],
              ["ניתוח", XP.analysis],
              ["תמונה", XP.photo],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface-2 px-2 py-1.5 text-center">
                {k} <b className="text-green">+{v}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <Flame className="size-10 text-warn" />
            <div>
              <div className="text-3xl font-bold">{streak.current} ימים</div>
              <div className="text-sm text-muted">רצף נוכחי · שיא {streak.best}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {lastNDays(14).map((d) => {
              const active = (s.completions[d]?.length ?? 0) > 0 || !!s.checkins[d];
              return <div key={d} title={heDate(d)} className={cn("h-6 flex-1 rounded", active ? "bg-green" : "bg-surface-3")} />;
            })}
          </div>
          <div className="mt-1 text-[11px] text-dim">14 הימים האחרונים</div>
        </Card>
      </div>

      <WeeklyReport />
      <HabitHeatmap />
      <RatingsCard />
      <ScanHistoryCard />
      <PhotoQualityCoach />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={<Trophy className="size-4" />} label="משימות שהושלמו" value={totalTasks} />
        <MiniStat icon={<Dumbbell className="size-4" />} label="אימונים" value={s.workouts.length} href="/fitness" />
        <MiniStat icon={<Scissors className="size-4" />} label="תספורות שניסיתי" value={s.haircuts.length} href="/hair" />
        <MiniStat icon={<Heart className="size-4" />} label="מוצרים שאהבתי" value={s.products.filter((p) => p.liked).length} href="/skin" />
      </div>

      <Card>
        <SectionTitle
          action={
            <Segmented<"7" | "30">
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "שבוע" },
                { value: "30", label: "30 יום" },
              ]}
            />
          }
        >
          השלמת הרגלים
        </SectionTitle>
        <WeeklyBars data={habitData} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>השלמה לפי תחום (30 יום)</SectionTitle>
          {categoryStats.length ? (
            <div className="space-y-3">
              {categoryStats.map(([cat, v]) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{CATEGORY_META[cat]?.label}</span>
                    <span className="text-muted">
                      {v.done}/{v.total}
                    </span>
                  </div>
                  <ProgressBar value={v.total ? (v.done / v.total) * 100 : 0} color={cat === "fitness" ? "green" : "accent"} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">עוד אין נתונים.</p>
          )}
        </Card>
        <Card>
          <SectionTitle>מצב רוח (Check-ins)</SectionTitle>
          <TrendArea data={moodData} color="var(--green)" />
        </Card>
      </div>

      <SkincareStreak />
      <Photos />
    </div>
  );
}

function MiniStat({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href?: string }) {
  const inner = (
    <Card interactive={!!href} className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <span className="text-accent">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SkincareStreak() {
  const s = useStore();
  const data = lastNDays(14).map((d) => {
    const skin = tasksForDate(s.plan, d, s.customTasks).filter((t) => t.category === "skin");
    const done = new Set(s.completions[d] ?? []);
    return { d, total: skin.length, done: skin.filter((t) => done.has(t.id)).length };
  });
  return (
    <Card>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Droplets className="size-4 text-accent" /> עקביות בשגרת הטיפוח (14 יום)
        </span>
      </SectionTitle>
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
        {data.map((x) => {
          const pct = x.total ? x.done / x.total : 0;
          return (
            <div key={x.d} className="text-center">
              <div className="mx-auto size-8 rounded-lg" style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(pct * 100)}%, var(--surface-3))` }} title={`${x.done}/${x.total}`} />
              <div className="mt-1 text-[10px] text-dim">{heDayShort(x.d)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Photos() {
  const photos = useStore((s) => s.photos);
  const add = useStore((s) => s.addPhoto);
  const remove = useStore((s) => s.removePhoto);
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [note, setNote] = useState("");
  const [cat, setCat] = useState<ProgressPhoto["category"]>("face");
  const [compare, setCompare] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | ProgressPhoto["category"]>("all");
  const [saving, setSaving] = useState(false);
  const shown = photos.filter((p) => filter === "all" || p.category === filter);

  async function save() {
    if (!blob) return;
    setSaving(true);
    const imageId = await saveImage(blob);
    add({ id: uid("ph"), date: dateKey(), imageId, note, category: cat });
    setSaving(false);
    setOpen(false);
    setBlob(null);
    setNote("");
  }

  const cmp = compare.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as ProgressPhoto[];

  return (
    <Card>
      <SectionTitle action={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>תמונה חדשה</Button>}>
        <span className="flex items-center gap-2">
          <Camera className="size-4 text-accent" /> תמונות התקדמות (אופציונלי)
        </span>
      </SectionTitle>
      <p className="mb-4 flex items-center gap-1.5 text-xs text-dim">
        <Lock className="size-3.5 text-green" /> פרטיות מלאה: התמונות נשמרות רק במכשיר הזה, לא נשלחות לשום מקום ולא מנותחות. אפשר למחוק בכל רגע.
      </p>
      {photos.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "face", "hair", "body", "style"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-xs", filter === f ? "border-accent text-accent" : "border-line text-muted")}>
              {{ all: "הכל", face: "פנים", hair: "שיער", body: "גוף", style: "סטייל" }[f]}
            </button>
          ))}
          {compare.length > 0 && <Badge tone="accent">נבחרו {compare.length}/2 להשוואה</Badge>}
        </div>
      )}
      {cmp.length === 2 && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-accent/30 p-3">
          {cmp
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((p) => (
              <div key={p.id}>
                <StoredImage imageId={p.imageId} alt="" className="aspect-[3/4] w-full rounded-xl" />
                <div className="mt-1 text-center text-xs text-muted">{heDate(p.date)}</div>
              </div>
            ))}
          <Button size="sm" variant="ghost" className="col-span-2" onClick={() => setCompare([])}>
            סגירת השוואה
          </Button>
        </div>
      )}
      {shown.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((p) => (
            <div key={p.id} className="group relative">
              <button
                onClick={() => setCompare((c) => (c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id].slice(-2)))}
                className={cn("block w-full overflow-hidden rounded-xl ring-2", compare.includes(p.id) ? "ring-accent" : "ring-transparent")}
              >
                <StoredImage imageId={p.imageId} alt={p.note || "תמונת התקדמות"} className="aspect-[3/4] w-full" />
              </button>
              <div className="mt-1 text-[11px] text-dim">{heDate(p.date)}</div>
              <button onClick={() => remove(p.id)} className="absolute left-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="מחיקה">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Camera className="size-5" />} title="אין תמונות התקדמות" text="צילום שבועי באותה תאורה וזווית עוזר לראות שינוי הדרגתי. לחצו על 2 תמונות כדי להשוות." />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="תמונת התקדמות">
        <div className="space-y-4">
          <div className="mx-auto max-w-60">
            <ImageUploader value={blob} onChange={setBlob} hint="אותה תאורה וזווית בכל פעם" aspect="aspect-[3/4]" />
          </div>
          <Field label="קטגוריה">
            <Select value={cat} onChange={(e) => setCat(e.target.value as ProgressPhoto["category"])}>
              <option value="face">פנים</option>
              <option value="hair">שיער</option>
              <option value="body">גוף / יציבה</option>
              <option value="style">סטייל</option>
            </Select>
          </Field>
          <Field label="הערה (אופציונלי)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          </Field>
          <Button className="w-full" disabled={!blob} loading={saving} onClick={save}>
            שמירה (+5 XP)
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
