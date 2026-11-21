"use client";
import { useState } from "react";
import type { AnalysisRecord, AnalysisType } from "./types";
import { blobToBase64, saveImage } from "./images";
import { fetchStatus, postJSON, profileContext } from "./api";
import { useStore } from "./store";
import { measureImageQuality, type ImageQuality } from "./demo";
import { uid, dateKey } from "./utils";

/**
 * Runs an analysis: real AI when the server has an API key, otherwise the
 * clearly-labeled demo generator. Saves the result (and photo, locally) to history.
 */
export function useAnalysis(type: AnalysisType) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const addAnalysis = useStore((s) => s.addAnalysis);

  async function run(opts: {
    image?: Blob | null;
    extra?: Record<string, unknown>;
    demo: (q: ImageQuality | null) => unknown;
    saveImageToHistory?: boolean;
  }) {
    setLoading(true);
    setError(null);
    try {
      const { aiEnabled } = await fetchStatus();
      let result: unknown;
      let source: "ai" | "demo";
      if (aiEnabled) {
        const body: Record<string, unknown> = {
          type,
          profile: profileContext(useStore.getState().profile),
          ...opts.extra,
        };
        if (opts.image) body.image = { mediaType: "image/jpeg", data: await blobToBase64(opts.image) };
        const res = await postJSON<{ result: unknown }>("/api/analyze", body);
        result = res.result;
        source = "ai";
      } else {
        const q = opts.image ? await measureImageQuality(opts.image) : null;
        await new Promise((r) => setTimeout(r, 500));
        result = opts.demo(q);
        source = "demo";
      }
      const imageId = opts.image && opts.saveImageToHistory !== false ? await saveImage(opts.image) : undefined;
      const rec: AnalysisRecord = { id: uid("an"), type, date: dateKey(), source, imageId, result };
      addAnalysis(rec);
      setRecord(rec);
      return rec;
    } catch (e) {
      setError((e as Error).message || "שגיאה בניתוח");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error, record, setRecord, clearError: () => setError(null) };
}
