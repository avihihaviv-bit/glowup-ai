import type { SourceKey } from "../sources";

export type Evidence = "evidence" | "limited" | "temporary" | "grooming" | "preference";

export interface Tip {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  minutes: number;
  difficulty: "easy" | "medium" | "hard";
  importance: "low" | "medium" | "high";
  when: string;
  products: string[];
  warning?: string;
  evidence: Evidence;
  source?: SourceKey;
  suitability?: string;
  outing?: boolean;
}

const EV = { E: "evidence", L: "limited", T: "temporary", G: "grooming", P: "preference" } as const;
const DIF = { e: "easy", m: "medium", h: "hard" } as const;
const IMP = { l: "low", m: "medium", h: "high" } as const;

/** Compact tip factory: keeps the data files readable (one tip per line). */
export function mk(category: string, outing = false) {
  return (
    id: string,
    subcategory: string,
    title: string,
    description: string,
    minutes: number,
    d: keyof typeof DIF,
    i: keyof typeof IMP,
    when: string,
    products: string,
    ev: keyof typeof EV,
    source?: SourceKey,
    warning?: string,
    suitability?: string,
  ): Tip => ({
    id,
    title,
    description,
    category,
    subcategory,
    minutes,
    difficulty: DIF[d],
    importance: IMP[i],
    when,
    products: products ? products.split("|") : [],
    evidence: EV[ev],
    source,
    warning,
    suitability,
    outing,
  });
}
