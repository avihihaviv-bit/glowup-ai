"use client";
import { useMemo, useState } from "react";
import { Flame, SquarePlay, Music2, Plus, Check, AlertTriangle, ExternalLink, ShoppingBag, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { KIND_LABEL, TRENDS, VERDICT, VIDEOS, type Platform, type TrendItem, type TrendKind, type Verdict } from "@/data/trends";
import { cn, dateKey, uid } from "@/lib/utils";
import { addTaskToPlan, planDay } from "@/lib/plan";
import { Badge, Button, Card, Chip, PageHeader, SectionTitle } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";

const VIDEO_BY_ID = Object.fromEntries(VIDEOS.map((v) => [v.id, v]));
const PlatformIcon = ({ p, className }: { p: Platform; className?: string }) => (p === "youtube" ? <SquarePlay className={cn("text-[#e0342b]", className)} /> : <Music2 className={className} />);

export default function TrendsPage() {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [verdict, setVerdict] = useState<Verdict | "all">("all");
  const [kind, setKind] = useState<TrendKind | "all">("all");
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const list = useMemo(
    () =>
      TRENDS.filter(
        (t) =>
          (platform === "all" || t.videos.some((v) => VIDEO_BY_ID[v]?.platform === platform)) &&
          (verdict === "all" || t.verdict === verdict) &&
          (kind === "all" || t.kind === kind),
      ),
    [platform, verdict, kind],
  );

  function addToRoutine(t: TrendItem) {
    if (!t.task) return;
    const s = useStore.getState();
    const task = { id: uid("tr"), title: t.task.title, category: t.task.category, minutes: t.task.minutes, how: t.task.how, why: t.why, frequency: t.task.frequency, startWeek: 1, custom: true };
    if (s.plan && planDay(s.plan)) s.setPlan(addTaskToPlan(s.plan, task, dateKey()));
    else s.addCustomTasks([task]);
    setAdded((a) => ({ ...a, [t.id]: true }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="טרנדים: מה באמת עובד" subtitle="עצות glow up מסרטונים פופולריים ביוטיוב ובטיקטוק, עם בדיקה מה עובד, מה זמני ומה לא מוכח." icon={<Flame className="size-5" />} />

      <Card className="flex items-start gap-3 p-4 text-sm text-muted">
        <Info className="mt-0.5 size-5 shrink-0 text-accent" />
        <p>
          המידע על כל סרטון מבוסס על הכותרת, התיאור או הכיתוב שלו, ולא על צפייה מלאה בסרטון. כל עצה קיבלה בדיקה מול מקורות אמינים ודרך בטוחה לעשות אותה. מה שלא מוכח מסומן ככזה, ומה שעלול להזיק מסומן באזהרה.
        </p>
      </Card>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Chip active={platform === "all"} onClick={() => setPlatform("all")}>הכל</Chip>
          <Chip active={platform === "youtube"} onClick={() => setPlatform("youtube")}>YouTube</Chip>
          <Chip active={platform === "tiktok"} onClick={() => setPlatform("tiktok")}>TikTok</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={verdict === "all"} onClick={() => setVerdict("all")}>כל הבדיקות</Chip>
          {(Object.keys(VERDICT) as Verdict[]).map((v) => (
            <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)}>{VERDICT[v].label}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={kind === "all"} onClick={() => setKind("all")}>הכל</Chip>
          {(Object.keys(KIND_LABEL) as TrendKind[]).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => (
          <Card key={t.id} className="flex min-w-0 flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{t.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge>{KIND_LABEL[t.kind]}</Badge>
                  {t.minutes > 0 && <Badge>{t.minutes} דק׳</Badge>}
                </div>
              </div>
              <Badge tone={VERDICT[t.verdict].tone} className="shrink-0 whitespace-nowrap">{VERDICT[t.verdict].label}</Badge>
            </div>

            <div className="rounded-2xl bg-surface-2 p-3 text-sm">
              <div className="mb-1 text-xs font-semibold text-muted">מה אומרים בסרטון</div>
              <p>{t.claim}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.videos.map((id) => {
                  const v = VIDEO_BY_ID[id];
                  return (
                    <a key={id} href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-muted hover:border-accent" dir="ltr">
                      <PlatformIcon p={v.platform} className="size-3.5 shrink-0" />
                      <span className="truncate">{v.creator ?? v.title}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="text-sm">
              <div className="mb-1 text-xs font-semibold text-muted">מה באמת</div>
              <p className="leading-6">{t.why}</p>
            </div>

            <div className="text-sm">
              <div className="mb-1 text-xs font-semibold text-muted">איך לעשות נכון</div>
              <ul className="space-y-1 text-muted">
                {t.how.map((h) => (
                  <li key={h} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{h}</li>
                ))}
              </ul>
            </div>

            {t.products && t.products.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <ShoppingBag className="size-3.5 text-accent" /> {t.products.join(" · ")}
              </p>
            )}
            {t.warning && (
              <p className="flex items-start gap-2 rounded-2xl bg-warn-bg p-3 text-xs text-warn">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {t.warning}
              </p>
            )}
            {t.source && <SourceLinks keys={[t.source]} />}

            {t.task && (
              <Button className="mt-auto" size="sm" variant={added[t.id] ? "green" : "secondary"} icon={added[t.id] ? <Check className="size-4" /> : <Plus className="size-4" />} disabled={added[t.id]} onClick={() => addToRoutine(t)}>
                {added[t.id] ? "נוסף לשגרה" : "הוספה לשגרה"}
              </Button>
            )}
          </Card>
        ))}
      </div>
      {!list.length && <p className="text-center text-sm text-muted">אין פריטים שמתאימים לסינון.</p>}

      <Card>
        <SectionTitle>הסרטונים שנבדקו</SectionTitle>
        <ul className="divide-y divide-line">
          {VIDEOS.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-3">
              <PlatformIcon p={v.platform} className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-semibold hover:text-accent" dir="ltr">
                  <span className="truncate">{v.title}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
                {v.creator && <div className="text-xs text-dim" dir="ltr">{v.creator}</div>}
                <p className="mt-0.5 text-sm text-muted">{v.covers}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
