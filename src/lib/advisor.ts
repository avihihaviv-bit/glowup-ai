import { CAT_BY_ID, FRAGRANCE_COMBOS, OCCASION_LABEL, SEASON_LABEL, INTENSITY_LABEL, BUDGET_LABEL, type AdvisorCat, type Budget, type Intensity, type Occasion, type PrefOption, type Season } from "@/data/advisor";
import type { AdviceAI } from "./schemas";
import type { Fragrance, Product, ScannedProduct } from "./types";

export interface AdvisorPref {
  likes: string[];
  avoid: string[];
  love: string;
  intensity?: Intensity;
  occasion?: Occasion;
  season?: Season;
  budget: Budget;
}

export type Advice = AdviceAI & { source: "ai" | "rules" };

export interface AdviceEntry {
  id: string;
  date: string;
  cat: AdvisorCat;
  request: string;
  advice: Advice;
}

export const emptyPref = (): AdvisorPref => ({ likes: [], avoid: [], love: "", budget: "any" });

export interface OwnedCtx {
  fragrances: Fragrance[];
  products: Product[];
  scanned: ScannedProduct[];
}

const PRODUCT_CAT: Record<AdvisorCat, { product: Product["category"][]; scanned: ScannedProduct["type"][] }> = {
  fragrance: { product: [], scanned: ["fragrance"] },
  deodorant: { product: ["deodorant"], scanned: ["deodorant"] },
  skin: { product: ["cleanser", "moisturizer", "spf", "serum"], scanned: ["cleanser", "moisturizer", "spf", "serum", "exfoliant"] },
  hair: { product: ["hair"], scanned: ["shampoo", "conditioner", "styling"] },
  body: { product: ["other"], scanned: ["other"] },
  oral: { product: ["oral"], scanned: ["toothpaste", "mouthwash"] },
};

const low = (s: string) => s.toLowerCase();
const fragranceText = (f: Fragrance) => low(`${f.name} ${f.brand} ${f.family} ${f.notes}`);

/** Free-text words in "what I love" that map to options, so typing "וניל" counts as liking sweet. */
export function optionsFromText(cat: AdvisorCat, text: string): string[] {
  const t = low(text);
  if (!t.trim()) return [];
  return CAT_BY_ID[cat].options.filter((o) => (o.keywords ?? []).some((k) => t.includes(low(k)))).map((o) => o.id);
}

function ingredientMatch(o: PrefOption, ingredients: string[]): boolean | null {
  const test = o.ingredientTest;
  if (!test || (!test.has && !test.lacks) || !ingredients.length) return null;
  const all = low(ingredients.join(" "));
  if (test.has && !test.has.some((x) => all.includes(x))) return false;
  if (test.lacks && test.lacks.some((x) => all.includes(x))) return false;
  return true;
}

/** Strings describing what the user owns in this category, sent to the AI as context. */
export function ownedSummary(cat: AdvisorCat, ctx: OwnedCtx): string[] {
  if (cat === "fragrance")
    return ctx.fragrances.map((f) => `${f.brand} ${f.name} (${f.concentration}) · משפחה: ${f.family || "?"} · דירוג שלי ${f.rating}/5 · עונות: ${f.seasons.map((s) => SEASON_LABEL[s]).join("/") || "-"} · הערות שלי: ${f.notes || "-"}`.slice(0, 400));
  const map = PRODUCT_CAT[cat];
  return [
    ...ctx.products.filter((p) => map.product.includes(p.category)).map((p) => `${p.name} (${p.category})${p.liked ? " · אוהב" : ""}${p.notes ? ` · ${p.notes}` : ""}`.slice(0, 400)),
    ...ctx.scanned.filter((p) => map.scanned.includes(p.type)).map((p) => `${p.brand} ${p.name} (${p.type}) · רכיבים: ${p.ingredients.slice(0, 25).join(", ") || "לא ידועים"}`.slice(0, 400)),
  ];
}

export function requestText(cat: AdvisorCat, p: AdvisorPref): string {
  const def = CAT_BY_ID[cat];
  const lab = (id: string) => def.options.find((o) => o.id === id)?.label ?? id;
  return [
    def.title,
    p.likes.length ? `אוהב: ${p.likes.map(lab).join(", ")}` : "",
    p.avoid.length ? `בלי: ${p.avoid.map(lab).join(", ")}` : "",
    p.intensity ? INTENSITY_LABEL[p.intensity] : "",
    p.occasion ? OCCASION_LABEL[p.occasion] : "",
    p.season ? SEASON_LABEL[p.season] : "",
    p.love.trim() ? `״${p.love.trim().slice(0, 80)}״` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface ParsedText {
  season?: Season;
  intensity?: Intensity;
  occasion?: Occasion;
  budget?: Budget;
  budgetAmount?: number;
  longLasting?: boolean;
  hours?: number;
}

const PREFIXES = ["", "ו", "ב", "ל", "ה", "ש", "מ", "וב", "ול", "וה", "שב", "של"];
function hasWord(tokens: string[], words: string[]) {
  return tokens.some((t) => words.some((w) => PREFIXES.some((p) => t === p + w)));
}

/** Reads season, strength, longevity, occasion and budget out of free text, so the rules engine understands "winter, vanilla, lasts 6+ hours, up to 200 NIS". */
export function parseText(text: string): ParsedText {
  const t = low(text).replace(/[״"׳']/g, "");
  const tokens = t.split(/[^\p{L}\d+]+/u).filter(Boolean);
  const out: ParsedText = {};
  if (hasWord(tokens, ["חורף", "חורפי", "חורפית", "winter"])) out.season = "winter";
  else if (hasWord(tokens, ["קיץ", "קייצי", "קייצית", "summer"])) out.season = "summer";
  else if (hasWord(tokens, ["סתיו", "סתווי", "autumn", "fall"])) out.season = "autumn";
  else if (hasWord(tokens, ["אביב", "spring"])) out.season = "spring";

  const negStrong = /לא\s+(ממש\s+|כל\s+כך\s+|מדי\s+|יותר\s+מדי\s+)?(חזק|בולט)/.test(t) || /חזק\s+מדי/.test(t);
  if (negStrong || hasWord(tokens, ["עדין", "עדינה", "קליל", "קלילה", "דיסקרטי", "soft", "light"])) out.intensity = "soft";
  else if (hasWord(tokens, ["חזק", "חזקה", "בולט", "בולטת", "מורגש", "נוכח", "strong", "beast"])) out.intensity = "bold";
  else if (hasWord(tokens, ["בינוני", "מאוזן"])) out.intensity = "medium";

  if (hasWord(tokens, ["עבודה", "משרד", "לימודים", "work", "office"])) out.occasion = "work";
  else if (hasWord(tokens, ["דייט", "דייטים", "date"])) out.occasion = "date";
  else if (hasWord(tokens, ["חתונה", "אירוע", "אירועים", "event"])) out.occasion = "event";
  else if (hasWord(tokens, ["ערב", "ערבים", "יציאה", "יציאות", "מסיבה", "night"])) out.occasion = "evening";
  else if (hasWord(tokens, ["ספורט", "אימון", "gym"])) out.occasion = "sport";
  else if (hasWord(tokens, ["יומיומי", "יומיום", "daily"])) out.occasion = "daily";

  const hours = t.match(/(\d{1,2})\s*\+?\s*(שעות|שעה|hours?|h\b)/);
  if (hours) out.hours = Number(hours[1]);
  if (hours || /מחזיק|מחזיקה|עמיד|לאורך\s+זמן|כל\s+היום|long.?lasting|longevity/.test(t)) out.longLasting = !hours || Number(hours[1]) >= 5;

  const money = t.match(/(\d{2,4})\s*(שח|ש\s*ח|שקל|שקלים|₪|nis|ils)/) ?? t.match(/(₪)\s*(\d{2,4})/);
  if (money) {
    const n = Number(money[1] === "₪" ? money[2] : money[1]);
    out.budgetAmount = n;
    out.budget = n <= 250 ? "low" : n <= 500 ? "mid" : "any";
  } else if (hasWord(tokens, ["זול", "זולה", "חסכוני", "cheap", "budget"])) out.budget = "low";
  return out;
}

/** Labels for what was understood from the text, for display. */
export function parsedLabels(x: ParsedText): string[] {
  return [
    x.season && SEASON_LABEL[x.season],
    x.intensity && INTENSITY_LABEL[x.intensity],
    x.occasion && OCCASION_LABEL[x.occasion],
    x.longLasting && (x.hours ? `מחזיק ${x.hours}+ שעות` : "מחזיק הרבה"),
    x.budgetAmount ? `עד ${x.budgetAmount} ש״ח` : x.budget === "low" && "תקציב חסכוני",
  ].filter(Boolean) as string[];
}

/** Rules-based advice: used without an AI key. Built only from the knowledge base and the user's own items. */
export function ruleAdvice(cat: AdvisorCat, input: AdvisorPref, ctx: OwnedCtx): Advice {
  const def = CAT_BY_ID[cat];
  // Explicit selections win; anything left empty is filled from the free text.
  const parsed = parseText(input.love);
  const p: AdvisorPref = {
    ...input,
    season: input.season ?? (def.hasSeason ? parsed.season : undefined),
    intensity: input.intensity ?? (def.hasIntensity ? parsed.intensity : undefined),
    occasion: input.occasion ?? (def.hasOccasion ? parsed.occasion : undefined),
    budget: input.budget === "any" && parsed.budget ? parsed.budget : input.budget,
  };
  const fromText = optionsFromText(cat, p.love).filter((id) => !p.avoid.includes(id));
  const likeIds = [...new Set([...p.likes, ...fromText])];
  let liked = def.options.filter((o) => likeIds.includes(o.id));
  const avoided = def.options.filter((o) => p.avoid.includes(o.id));

  // No explicit preference: fall back to what suits the season/occasion (fragrance) or the safest basics.
  let inferred = false;
  if (!liked.length) {
    inferred = true;
    liked =
      cat === "fragrance"
        ? def.options.filter((o) => (!p.season || o.seasons?.includes(p.season)) && (!p.occasion || o.occasions?.includes(p.occasion))).slice(0, 2)
        : def.options.slice(0, 1);
    if (!liked.length) liked = def.options.slice(0, 1);
  }

  const lookFor = [...new Set(liked.flatMap((o) => o.lookFor))].slice(0, 10);
  const picks: Advice["picks"] = [];
  const avoid: string[] = [];

  if (cat === "fragrance") {
    // 1. From the user's own collection
    const scored = ctx.fragrances
      .map((f) => {
        const t = fragranceText(f);
        const hits = liked.filter((o) => (o.keywords ?? []).some((k) => t.includes(low(k))));
        const bad = avoided.filter((o) => (o.keywords ?? []).some((k) => t.includes(low(k))));
        let score = hits.length * 3 - bad.length * 4 + f.rating * 0.6;
        if (p.season && f.seasons.includes(p.season)) score += 1.5;
        if (p.occasion && f.occasions.some((x) => x.includes(OCCASION_LABEL[p.occasion!].split(" ")[0]))) score += 1.5;
        return { f, score, hits, bad };
      })
      .filter((x) => x.hits.length && !x.bad.length)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    for (const { f, hits } of scored)
      picks.push({
        kind: "owned",
        title: `${f.brand} ${f.name}`.trim(),
        why: `לפי מה שרשמת עליו (${hits.map((h) => h.label).join(", ")}), והדירוג שלך ${f.rating}/5.`,
        how: sprayLine(f.concentration, p),
      });
    // 2. Combination direction
    const combo = FRAGRANCE_COMBOS.find((c) => likeIds.includes(c.ids[0]) && likeIds.includes(c.ids[1]));
    if (combo) picks.push({ kind: "type", title: "הכיוון שהכי מתאים לך", why: combo.text, how: "" });
    for (const o of liked.slice(0, 3)) picks.push({ kind: "type", title: `${o.label}: תווים לחפש`, why: `${o.lookFor.join(", ")}. ${o.why}`, how: "" });
    // 3. Well-known examples to test
    // Interleave examples across the liked families and skip what the user already owns.
    const owned = ctx.fragrances.map((f) => low(f.name)).filter((n) => n.length > 2);
    const lists = liked.map((o) => (o.examples ?? []).filter((e) => !owned.some((n) => low(e).includes(n))));
    const ex: string[] = [];
    for (let i = 0; ex.length < 4 && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && ex.length < 4 && !ex.includes(l[i])) ex.push(l[i]);
    for (const e of ex) picks.push({ kind: "example", title: e, why: "דוגמה מוכרת מהמשפחה שביקשת, לבדיקה על העור.", how: "" });
    // Concentration by intensity
    if (p.intensity)
      picks.push({
        kind: "type",
        title: "ריכוז מומלץ",
        why: { soft: "EDC או EDT: קל וקרוב לעור.", medium: "EDT או EDP: נוכחות מאוזנת.", bold: "EDP או Parfum: מחזיק ומורגש יותר, ועדיין 1-3 ריסוסים." }[p.intensity],
        how: "",
      });
    // Longevity
    if (parsed.longLasting)
      picks.push({
        kind: "type",
        title: parsed.hours ? `שיחזיק ${parsed.hours}+ שעות` : "שיחזיק הרבה זמן",
        why: "חפשו EDP או Parfum, עם תווי בסיס כבדים: וניל, טונקה, ענבר, עצים או מאסק. הם מחזיקים הרבה יותר מהדרים ותווים ימיים.",
        how: "לרסס על עור לח אחרי קרם לחות ללא ריח, או גם על הבגדים. לא לשפשף את פרקי הידיים.",
      });
    // Season-specific direction
    if (p.season === "winter" && liked.some((o) => o.id === "sweet") && !liked.some((o) => ["amber", "spicy", "woody"].includes(o.id)))
      picks.push({ kind: "type", title: "מתוק לחורף", why: "בחורף מתוק עובד הכי טוב כשיש לו גם בסיס חם: וניל עם ענבר, טונקה עם תבלינים (הל, קינמון) או וניל עם עצים. ככה הוא עשיר ומחזיק, ולא מתקתק מדי.", how: "" });
    // Season / occasion conflicts
    if (p.season === "summer" && liked.some((o) => ["sweet", "amber", "leather", "spicy"].includes(o.id)))
      avoid.push("בקיץ ריח מתוק או חם מורגש חזק יותר: ריסוס אחד, או גרסה קלה יותר (EDT).");
    if (p.occasion === "work" || p.occasion === "sport") avoid.push("בעבודה ובספורט: ריח קרוב לעור, לא יותר משני ריסוסים.");
  } else {
    // Owned products checked against preferences by ingredient list
    const map = PRODUCT_CAT[cat];
    for (const sp of ctx.scanned.filter((x) => map.scanned.includes(x.type))) {
      const tests = liked.map((o) => ({ o, ok: ingredientMatch(o, sp.ingredients) })).filter((t) => t.ok !== null);
      const badTests = avoided.map((o) => ({ o, ok: ingredientMatch(o, sp.ingredients) })).filter((t) => t.ok === true);
      if (!tests.length) continue;
      const okAll = tests.every((t) => t.ok) && !badTests.length;
      picks.push({
        kind: "owned",
        title: `${sp.brand} ${sp.name}`.trim(),
        why: okAll
          ? `לפי רשימת הרכיבים שנשמרה הוא מתאים ל: ${tests.map((t) => t.o.label).join(", ")}.`
          : `לפי רשימת הרכיבים הוא לא מתאים ל: ${tests.filter((t) => !t.ok).map((t) => t.o.label).concat(badTests.map((t) => `להימנע מ${t.o.label}`)).join(", ")}.`,
        how: okAll ? "אפשר להמשיך להשתמש בו." : "שווה לשקול חלופה כשהוא נגמר.",
      });
    }
    for (const pr of ctx.products.filter((x) => map.product.includes(x.category) && x.liked))
      picks.push({ kind: "owned", title: pr.name, why: "סימנת שאתה אוהב אותו. אם הוא עובד לך, אין סיבה להחליף.", how: "" });
    for (const o of liked) picks.push({ kind: "type", title: o.productType ?? o.label, why: o.why, how: `לחפש על התווית: ${o.lookFor.join(", ")}` });
  }

  for (const o of liked) if (o.caution) avoid.push(o.caution);
  for (const o of avoided) avoid.push(`ביקשת בלי ${o.label}: לבדוק שלא כתוב ${o.lookFor.slice(0, 3).join(" / ")}.`);
  if (p.budget === "low")
    avoid.push(
      cat === "fragrance"
        ? `${parsed.budgetAmount ? `בתקציב של עד ${parsed.budgetAmount} ש״ח` : "בתקציב חסכוני"}: חלק מהדוגמאות למעלה עשויות לעלות יותר בבקבוק מלא. אפשר לחפש גודל קטן (30-50 מ״ל), דיקאנט (חלוקה לבקבוקון), מבצעים, או בשמים זולים יותר באותה משפחת ריח. המחירים משתנים, אז בודקים לפני שקונים.`
        : "בתקציב חסכוני: מוצרי פארם בסיסיים עובדים מצוין, ומחיר גבוה לא אומר תוצאה טובה יותר.",
    );

  const understood = [...def.options.filter((o) => fromText.includes(o.id)).map((o) => o.label), ...parsedLabels(parsed)];
  const ex = p.love.trim() ? ` לפי מה שכתבת, ${understood.length ? `הבנתי: ${understood.join(", ")}.` : "לא זיהיתי מילות מפתח, אז התבססתי על הבחירות שלך."}` : "";
  const summary = inferred
    ? `לא בחרת העדפה, אז זו נקודת פתיחה בטוחה: ${liked.map((o) => o.label).join(" ו")}.${ex}`
    : `אתה מחפש ${def.title}: ${liked.map((o) => o.label).join(", ")}${p.season ? `, ל${SEASON_LABEL[p.season]}` : ""}${p.occasion ? `, ל${OCCASION_LABEL[p.occasion]}` : ""}.${ex} למטה מה לחפש, מה כבר יש לך שמתאים, ומה כדאי לבדוק.`;

  return {
    source: "rules",
    summary,
    lookFor,
    picks: picks.slice(0, 9),
    avoid: [...new Set(avoid)],
    general: def.general,
    testing: def.testing,
  };
}

function sprayLine(c: Fragrance["concentration"], p: AdvisorPref) {
  let n = { EDC: 3, EDT: 2, EDP: 2, Parfum: 1, Other: 2 }[c];
  if (p.season === "summer") n -= 1;
  if (p.occasion === "work" || p.occasion === "sport") n -= 1;
  if (p.intensity === "soft") n -= 1;
  if (p.intensity === "bold") n += 1;
  n = Math.max(1, Math.min(3, n));
  return `${n} ${n === 1 ? "ריסוס" : "ריסוסים"} (${c})`;
}

export { BUDGET_LABEL };
