"use client";
import type { Plan, Profile } from "./types";
import type { PlanAI } from "./schemas";
import { buildDemoPlan, planFromAI } from "./plan";
import { fetchStatus, postJSON, profileContext } from "./api";
import { useStore } from "./store";

function analysisContext() {
  const s = useStore.getState();
  const face = s.analyses.find((a) => a.type === "face");
  const hair = s.analyses.find((a) => a.type === "hair");
  const parts: string[] = [];
  if (face) parts.push(`צורת פנים: ${face.result?.faceShape?.shape}`);
  if (hair) parts.push(`שיער: ${hair.result?.length}, ${hair.result?.texture}`);
  if (s.manualFaceShape) parts.push(`צורת פנים שנבחרה: ${s.manualFaceShape}`);
  if (s.products.length) parts.push(`מוצרים קיימים: ${s.products.map((p) => p.name).join(", ")}`);
  return parts.join(" | ");
}

/** Creates a plan using real AI when configured; otherwise (or with forceDemo) the curated demo plan. */
export async function createPlan(profile: Profile, opts: { forceDemo?: boolean } = {}): Promise<{ plan: Plan; aiError?: string }> {
  const { aiEnabled } = await fetchStatus();
  if (!aiEnabled || opts.forceDemo) return { plan: buildDemoPlan(profile) };
  try {
    const res = await postJSON<{ plan: PlanAI }>("/api/plan", { profile: profileContext(profile), context: analysisContext() });
    return { plan: planFromAI(res.plan, profile) };
  } catch (e) {
    return { plan: buildDemoPlan(profile), aiError: (e as Error).message };
  }
}
