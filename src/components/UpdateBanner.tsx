"use client";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { applyUpdate, useUpdateCheck } from "@/lib/updates";

/** Small bar that appears when a newer version has been deployed. */
export function UpdateBanner() {
  const { state, latest } = useUpdateCheck({ auto: true });
  const [hidden, setHidden] = useState(false);
  if (state !== "available" || hidden) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+80px)] z-40 mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-accent p-2.5 ps-4 text-sm text-white shadow-lg lg:bottom-6" role="status">
      <span className="flex-1">גרסה חדשה של GLOWUP זמינה</span>
      <button onClick={() => applyUpdate(latest)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-3 font-semibold text-accent-strong">
        <RefreshCw className="size-4" /> עדכון
      </button>
      <button onClick={() => setHidden(true)} className="grid size-9 place-items-center rounded-xl text-white/80" aria-label="סגירה">
        <X className="size-4" />
      </button>
    </div>
  );
}
