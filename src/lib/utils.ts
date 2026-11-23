import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Local date key yyyy-mm-dd */
export function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

export function lastNDays(n: number, end: string = dateKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

const HE_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
export function heDayShort(key: string) {
  return HE_DAYS[parseKey(key).getDay()];
}

export function heDate(key: string) {
  return parseKey(key).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

export const CATEGORY_META: Record<string, { label: string; color: string; emoji: string }> = {
  skin: { label: "טיפוח עור", color: "#2878f0", emoji: "" },
  hair: { label: "שיער", color: "#174ea6", emoji: "" },
  style: { label: "סטייל", color: "#3a8ee6", emoji: "" },
  fitness: { label: "כושר", color: "#1f6fd1", emoji: "" },
  posture: { label: "יציבה", color: "#4aa3e8", emoji: "" },
  sleep: { label: "שינה", color: "#5b7fc4", emoji: "" },
  nutrition: { label: "תזונה", color: "#2f86c9", emoji: "" },
  mindset: { label: "ביטחון ותודעה", color: "#4f6fa8", emoji: "" },
};
export const now = () => Date.now();
