"use client";
import type { Concern } from "./types";
import type { ConcernAnalysisAI } from "./schemas";
import { CATEGORY_GUIDE } from "./concernsKnowledge";
import { blobToBase64, getImage } from "./images";
import { ApiError, fetchStatus, postJSON, profileContext } from "./api";
import { useStore } from "./store";
import { dateKey } from "./utils";

/** Analyze (or re-analyze) one concern. Real AI when configured; otherwise labeled category-level guidance. */
export async function analyzeConcernById(id: string, opts: { sendImage?: boolean } = {}) {
  const s = useStore.getState();
  const concern = s.concerns.find((c) => c.id === id);
  if (!concern) return;
  const { aiEnabled } = await fetchStatus();

  const demo = (reason?: string) => {
    const guide = CATEGORY_GUIDE[concern.category] ?? CATEGORY_GUIDE.other;
    const data: ConcernAnalysisAI = {
      understanding: reason
        ? `ה-AI לא היה זמין כרגע (${reason}), אז זו הכוונה כללית לקטגוריה. אפשר לנתח שוב בעוד כמה דקות.`
        : concern.description
          ? `כתבת: "${concern.description.slice(0, 200)}". במצב דמו המערכת לא מבינה את הטקסט, והתוכן שלהלן הוא הכוונה כללית לקטגוריה.`
          : `"${concern.title}": הכוונה כללית לקטגוריה (מצב דמו).`,
      supportiveNote: "הצעד הראשון כבר נעשה: שמת לב למה שחשוב לך.",
      ...guide,
    };
    useStore.getState().updateConcern(id, { analysis: { source: "demo", date: dateKey(), data } });
  };

  if (!aiEnabled) {
    demo();
    return;
  }

  let image: { mediaType: "image/jpeg"; data: string } | undefined;
  if (opts.sendImage && concern.imageId) {
    const blob = await getImage(concern.imageId);
    if (blob) image = { mediaType: "image/jpeg", data: await blobToBase64(blob) };
  }
  try {
    const res = await postJSON<{ analysis: ConcernAnalysisAI }>("/api/concerns", {
      profile: profileContext(s.profile),
      title: concern.title,
      description: concern.description,
      category: concern.category,
      image,
    });
    useStore.getState().updateConcern(id, { analysis: { source: "ai", date: dateKey(), data: res.analysis } });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    if ([400, 403, 422].includes(status)) throw e;
    demo((e as Error).message);
  }
}

export function newConcern(partial: Pick<Concern, "title" | "description" | "category"> & { imageId?: string }, id: string): Concern {
  return { id, status: "new", createdAt: new Date().toISOString(), progress: [], thread: [], ...partial };
}
