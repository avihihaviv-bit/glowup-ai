import type { Concern, Goal } from "./types";
import { addDays, dateKey } from "./utils";

export interface Priority {
  id: string; // "concern:<id>" or "goal:<key>" or "habit:checkin"
  kind: "concern" | "goal" | "habit";
  key: string; // i18n prefix for goal/habit ("prio.<key>"), concern id for concerns
  title?: string; // concerns carry their own title
  minutes: number;
  href: string;
  score: number;
}

interface Snapshot {
  profile: { goals: Goal[]; minutesPerDay: number } | null;
  concerns: Concern[];
  checkins: Record<string, { waterGlasses: number }>;
  workouts: { date: string }[];
  analyses: { type: string }[];
  products: unknown[];
  favorites: string[];
  priorityPins: string[];
}

const GOAL_RULES: { goal: Goal; key: string; href: string; minutes: number }[] = [
  { goal: "sleep", key: "sleep", href: "/fitness", minutes: 10 },
  { goal: "skin", key: "skin", href: "/skin", minutes: 5 },
  { goal: "puffiness", key: "skin", href: "/skin", minutes: 5 },
  { goal: "haircut", key: "hair", href: "/hair", minutes: 15 },
  { goal: "hairHealth", key: "hair", href: "/hair", minutes: 15 },
  { goal: "posture", key: "posture", href: "/fitness", minutes: 5 },
  { goal: "muscle", key: "muscle", href: "/fitness", minutes: 30 },
  { goal: "nutrition", key: "nutrition", href: "/fitness", minutes: 5 },
  { goal: "style", key: "style", href: "/style", minutes: 10 },
  { goal: "grooming", key: "style", href: "/face", minutes: 10 },
  { goal: "confidence", key: "confidence", href: "/progress", minutes: 5 },
];

/**
 * Rule-based candidate ranking. Considers goals, open concerns, existing data gaps and recent activity.
 * Never uses attractiveness, weight or body measurements.
 */
export function rankPriorities(s: Snapshot): Priority[] {
  const out = new Map<string, Priority>();
  const bump = (p: Priority) => {
    const cur = out.get(p.id);
    if (cur) cur.score = Math.max(cur.score, p.score) + 0.5;
    else out.set(p.id, p);
  };

  // open concerns: strongest signal
  s.concerns
    .filter((c) => c.status !== "completed")
    .forEach((c, i) =>
      bump({
        id: `concern:${c.id}`,
        kind: "concern",
        key: c.id,
        title: c.title,
        minutes: 10,
        href: `/concerns?open=${c.id}`,
        score: 10 - Math.min(i, 3) + (c.status === "improving" ? -2 : 0),
      }),
    );

  const goals = new Set(s.profile?.goals ?? []);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(dateKey(), -i));
  const recentWorkouts = s.workouts.filter((w) => last7.includes(w.date)).length;
  const water = last7.map((d) => s.checkins[d]?.waterGlasses).filter((v): v is number => typeof v === "number");
  const lowWater = water.length > 0 && water.reduce((a, b) => a + b, 0) / water.length < 6;
  const hasSkinData = s.products.length > 0 || s.analyses.some((a) => a.type === "skin");
  const hasHairData = s.favorites.length > 0 || s.analyses.some((a) => a.type === "hair");

  for (const r of GOAL_RULES) {
    if (!goals.has(r.goal)) continue;
    let score = 5;
    if (r.key === "skin" && !hasSkinData) score += 2;
    if (r.key === "hair" && !hasHairData) score += 2;
    if (r.key === "muscle" && recentWorkouts < 2) score += 2;
    if (r.key === "nutrition" && lowWater) score += 2;
    bump({ id: `goal:${r.key}`, kind: "goal", key: r.key, minutes: r.minutes, href: r.href, score });
  }
  if (lowWater && !goals.has("nutrition"))
    bump({ id: "goal:nutrition", kind: "goal", key: "nutrition", minutes: 5, href: "/fitness", score: 4 });

  const hasRecentCheckin = last7.slice(0, 3).some((d) => s.checkins[d]);
  if (!hasRecentCheckin) bump({ id: "habit:checkin", kind: "habit", key: "checkin", minutes: 1, href: "/", score: 3 });

  return [...out.values()].sort((a, b) => b.score - a.score);
}

/** Top 3: user pins first (valid ones only), then the highest-ranked remaining candidates. */
export function topPriorities(s: Snapshot): { top: (Priority & { pinned: boolean })[]; candidates: Priority[] } {
  const ranked = rankPriorities(s);
  const byId = new Map(ranked.map((p) => [p.id, p]));
  const pinned = s.priorityPins.map((id) => byId.get(id)).filter((p): p is Priority => !!p);
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const top = [
    ...pinned.slice(0, 3).map((p) => ({ ...p, pinned: true })),
    ...ranked.filter((p) => !pinnedIds.has(p.id)).map((p) => ({ ...p, pinned: false })),
  ].slice(0, 3);
  return { top, candidates: ranked };
}
