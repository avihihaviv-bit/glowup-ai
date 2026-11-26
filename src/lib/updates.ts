"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const CURRENT_VERSION = process.env.APP_VERSION ?? "dev";
export const BUILT_AT = process.env.APP_BUILT_AT ?? null;

export type UpdateState = "idle" | "checking" | "latest" | "available" | "noserver" | "error";

/** Checks the deployed version against the one this page is running. */
export function useUpdateCheck({ auto = false } = {}) {
  const [state, setState] = useState<UpdateState>("idle");
  const [latest, setLatest] = useState<string | null>(null);
  const last = useRef(0);

  const check = useCallback(async () => {
    last.current = Date.now();
    setState("checking");
    try {
      const r = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return setState("noserver");
      const d = (await r.json()) as { version?: string };
      if (!d.version) return setState("noserver");
      setLatest(d.version);
      setState(d.version !== CURRENT_VERSION ? "available" : "latest");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (!auto) return;
    const run = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > 10 * 60_000) void check();
    };
    const t = setTimeout(run, 4000);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", run);
    };
  }, [auto, check]);

  return { state, latest, check };
}

/**
 * Loads the new version in place. Saved data (localStorage / IndexedDB) and the home-screen icon stay.
 * Clears only HTTP caches the app may have created, then reloads with a cache-busting parameter.
 */
export async function applyUpdate(version?: string | null) {
  try {
    if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
    if ("serviceWorker" in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.update().catch(() => {});
  } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set("v", version ?? String(Date.now()));
  window.location.replace(url.toString());
}
