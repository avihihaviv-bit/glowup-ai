"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Keeps <html lang/dir> in sync with the selected language. */
export function LangSync() {
  const lang = useStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);
  return null;
}
