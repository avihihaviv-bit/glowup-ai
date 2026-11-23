import type { ScannedProduct } from "./types";
import type { SourceKey } from "@/data/sources";

/**
 * Conservative compatibility notes based only on ingredient lists the user actually has
 * (from the label photo or the product database) and on verified sources. No inference beyond that.
 */
export interface CompatNote {
  kind: "duplicate" | "combo" | "fragrance";
  text: string;
  products: string[];
  source?: SourceKey;
}

const has = (p: ScannedProduct, re: RegExp) => p.ingredients.some((i) => re.test(i.toLowerCase()));
const RETINOID = /retin|adapalene|tretinoin/;
const ACID = /glycolic|lactic|salicylic|mandelic|\baha\b|\bbha\b/;
const BPO = /benzoyl peroxide/;
const FRAG = /\bparfum\b|\bfragrance\b|\baroma\b/;
const LEAVE_ON = new Set(["moisturizer", "spf", "serum", "styling", "fragrance", "deodorant"]);

export function compatNotes(products: ScannedProduct[]): CompatNote[] {
  const out: CompatNote[] = [];
  const byType = new Map<string, ScannedProduct[]>();
  for (const p of products) byType.set(p.type, [...(byType.get(p.type) ?? []), p]);
  for (const [type, list] of byType) {
    if (list.length > 1 && type !== "other" && type !== "fragrance") {
      out.push({ kind: "duplicate", text: `יש לך ${list.length} מוצרים מאותו סוג. בדרך כלל אחד מספיק בשגרה.`, products: list.map((p) => p.name) });
    }
  }
  const ret = products.filter((p) => has(p, RETINOID));
  const strong = products.filter((p) => has(p, ACID) || has(p, BPO));
  if (ret.length && strong.length) {
    out.push({
      kind: "combo",
      text: "שילוב של רטינואיד עם חומצות מקלפות או בנזואיל פרוקסיד עלול להגביר יובש וגירוי. כדאי לא להשתמש בהם באותו ערב, ולהתייעץ אם יש גירוי.",
      products: [...new Set([...ret, ...strong].map((p) => p.name))],
      source: "aadExfoliate",
    });
  }
  const frag = products.filter((p) => LEAVE_ON.has(p.type) && p.type !== "fragrance" && has(p, FRAG));
  if (frag.length) {
    out.push({ kind: "fragrance", text: "מוצרים שנשארים על העור ומכילים בישום. לעור רגיש, מוצר ללא בישום עדיף.", products: frag.map((p) => p.name), source: "aadContactDermatitis" });
  }
  return out;
}
