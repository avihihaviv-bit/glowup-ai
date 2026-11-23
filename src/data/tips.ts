/**
 * GLOWUP AI tip library: 250 daily tips + 100 outing tips.
 * Health or science claims cite a source from the verified registry (src/data/sources.ts).
 * Grooming and style tips are labeled as such and carry no source.
 */
import type { Evidence, Tip } from "./tips/mk";
import { FACE, SKIN, PUFF, HAIR, STYLING } from "./tips/daily1";
import { ORAL, BODY, FRAG, SLEEP, FOOD, POSTURE, STYLE, DETAILS } from "./tips/daily2";
import { OUTING } from "./tips/outing";

export type { Evidence, Tip };

export const DAILY_TIPS: Tip[] = [...FACE, ...SKIN, ...PUFF, ...HAIR, ...STYLING, ...ORAL, ...BODY, ...FRAG, ...SLEEP, ...FOOD, ...POSTURE, ...STYLE, ...DETAILS];
export const OUTING_TIPS: Tip[] = OUTING;
export const TIPS: Tip[] = [...DAILY_TIPS, ...OUTING_TIPS];

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  evidence: "מבוסס ראיות",
  limited: "ראיות מוגבלות",
  temporary: "אפקט קוסמטי זמני",
  grooming: "עצת טיפוח כללית",
  preference: "העדפה אישית / סטייל",
};

export const TIP_CATEGORY: Record<string, string> = {
  face: "טיפוח פנים",
  skin: "עור ואקנה",
  puffiness: "נפיחות ואזור העיניים",
  hairCare: "טיפוח שיער",
  hairStyling: "עיצוב שיער",
  oral: "פה ונשימה",
  body: "היגיינת גוף",
  fragrance: "בשמים",
  sleep: "שינה והתאוששות",
  nutrition: "תזונה ושתייה",
  posture: "יציבה ותנועה",
  style: "לבוש וסטייל",
  grooming: "פרטים קטנים",
  oFragrance: "יציאה: ריח",
  oOral: "יציאה: פה ונשימה",
  oSkin: "יציאה: פנים ועור",
  oHair: "יציאה: שיער",
  oOutfit: "יציאה: לבוש",
  oHygiene: "יציאה: מקלחת והיגיינה",
  oFinal: "יציאה: בדיקה אחרונה",
  oBag: "יציאה: תיק וציוד",
};

/** Same daily tip for the whole day, rotating; skips hidden tips. */
export function tipOfTheDay(key: string, hidden: string[] = [], preferCats: string[] = []): Tip {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = DAILY_TIPS.filter((t) => !hidden.includes(t.id));
  const preferred = pool.filter((t) => preferCats.includes(t.category));
  const list = preferred.length && h % 3 !== 0 ? preferred : pool;
  return list[h % list.length] ?? DAILY_TIPS[0];
}
