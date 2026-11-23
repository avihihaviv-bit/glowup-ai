"use client";
import { useEffect, useState } from "react";
import type { Profile } from "./types";
import { useStore, computeStreak, dayScore } from "./store";
import { dateKey, lastNDays } from "./utils";
import { planDay } from "./plan";

let statusPromise: Promise<{ aiEnabled: boolean; model: string | null; imageGen?: boolean }> | null = null;

export function fetchStatus() {
  if (!statusPromise) {
    statusPromise = fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ aiEnabled: false, model: null, imageGen: false }));
  }
  return statusPromise;
}

export function useAIStatus() {
  const [status, setStatus] = useState<{ aiEnabled: boolean; model: string | null; imageGen?: boolean; loading: boolean }>({
    aiEnabled: false,
    model: null,
    imageGen: false,
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    fetchStatus().then((s) => alive && setStatus({ ...s, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `שגיאה (${res.status})`, res.status);
  return data as T;
}

/** Only non-identifying fields are sent to the AI (no photos of progress, no notes). */
export function profileContext(p: Profile | null) {
  if (!p) return {};
  return {
    name: p.name,
    age: p.age,
    gender: p.gender || undefined,
    goals: p.goals,
    minutesPerDay: p.minutesPerDay,
    budget: p.budget,
    skinType: p.skinType,
    fitnessLevel: p.fitnessLevel,
    heightCm: p.heightCm,
    language: useStore.getState().lang,
  };
}

export function progressContext() {
  const s = useStore.getState();
  const today = dateKey();
  const week = lastNDays(7).map((d) => ({ d, ...dayScore(s, d) }));
  const avg = Math.round(week.reduce((a, b) => a + b.score, 0) / 7);
  const streak = computeStreak(s);
  const recentCheckins = lastNDays(7)
    .map((d) => s.checkins[d])
    .filter(Boolean)
    .map((c) => ({ date: c.date, sleep: c.sleepHours, mood: c.mood, energy: c.energy, water: c.waterGlasses }));
  const lastFace = s.analyses.find((a) => a.type === "face");
  const ctx = {
    today,
    planDay: planDay(s.plan, today),
    planSource: s.plan?.source,
    weeklyAvgHabitCompletion: `${avg}%`,
    todayScore: `${dayScore(s, today).score}%`,
    streakDays: streak.current,
    workoutsLast7: s.workouts.filter((w) => lastNDays(7).includes(w.date)).length,
    recentCheckins,
    faceShape: lastFace?.result?.faceShape?.shape ?? s.manualFaceShape ?? undefined,
    favoriteHaircuts: s.favorites.slice(0, 5),
    likedProducts: s.products.filter((p) => p.liked).map((p) => p.name).slice(0, 8),
  };
  return JSON.stringify(ctx);
}

export async function streamCoach(
  messages: { role: "user" | "assistant"; content: string }[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  focus?: string,
) {
  const s = useStore.getState();
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: profileContext(s.profile), context: progressContext(), messages, focus }),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || "שגיאה בחיבור למאמן", res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}
