"use client";
/**
 * DEMO MODE — rules-based guidance used when no AI API key is configured.
 * Nothing here pretends to "see" the photo. The only thing computed from the
 * photo is technical image quality (brightness / contrast / resolution),
 * measured locally in the browser. Everything else comes from the user's own
 * selections + a curated knowledge base, and is labeled as such in the UI.
 */
import type { FaceAnalysis, HairAnalysis, SkinRoutine, StyleAnalysis } from "./schemas";
import { COLOR_RULES, FACE_SHAPE_INFO, HAIRSTYLES, type FaceShape, type Hairstyle } from "./knowledge";
import type { Profile } from "./types";

export interface ImageQuality {
  width: number;
  height: number;
  brightness: number; // 0-255
  contrast: number; // std dev
  sharpness: number; // laplacian variance-ish
}

export async function measureImageQuality(blob: Blob): Promise<ImageQuality> {
  const bmp = await createImageBitmap(blob);
  const size = 256;
  const scale = Math.min(1, size / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    gray[i] = g;
    sum += g;
  }
  const mean = sum / (w * h);
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) varSum += (gray[i] - mean) ** 2;
  let lap = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lap += v * v;
      n++;
    }
  return {
    width: bmp.width,
    height: bmp.height,
    brightness: mean,
    contrast: Math.sqrt(varSum / gray.length),
    sharpness: n ? lap / n : 0,
  };
}

function photoFeedback(q: ImageQuality | null, subject: string): FaceAnalysis["photo"] {
  if (!q) {
    return { usable: true, issue: "", lighting: "לא נמדד", angle: "לא נמדד", clarity: "לא נמדד", tips: [] };
  }
  const tips: string[] = [];
  let lighting = "תאורה טובה";
  if (q.brightness < 70) {
    lighting = "התמונה חשוכה";
    tips.push("צלמו מול חלון באור יום, בלי אור חזק מאחור.");
  } else if (q.brightness > 200) {
    lighting = "התמונה בהירה מדי (חשיפת יתר)";
    tips.push("הימנעו מאור שמש ישיר או פלאש — אור רך ומפוזר עדיף.");
  }
  if (q.contrast < 30) tips.push("ניגודיות נמוכה — רקע פשוט וכהה/בהיר מהנושא יעזור.");
  const sharp = q.sharpness > 120;
  const clarity = sharp ? "חדה מספיק" : "נראית מעט מטושטשת";
  if (!sharp) tips.push("נקו את העדשה, החזיקו יציב או השתמשו בטיימר.");
  const lowRes = Math.max(q.width, q.height) < 600;
  if (lowRes) tips.push("הרזולוציה נמוכה — השתמשו במצלמה הראשית ולא בצילום מסך.");
  tips.push(`למיטב התוצאות: ${subject}, בגובה העיניים, במרחק של כזרוע.`);
  return {
    usable: q.brightness >= 45 && !lowRes,
    issue: q.brightness < 45 ? "התמונה חשוכה מדי" : lowRes ? "רזולוציה נמוכה" : "",
    lighting: `${lighting} (בהירות ממוצעת ${Math.round(q.brightness)}/255)`,
    angle: "במצב דמו הזווית אינה נבדקת",
    clarity: `${clarity} · ${q.width}×${q.height}px`,
    tips,
  };
}

export function matchHairstyles(opts: {
  faceShape?: string | null;
  texture?: string | null;
  audience?: "masc" | "fem" | "any";
}): (Hairstyle & { match: number })[] {
  return HAIRSTYLES.map((h) => {
    let match = 0;
    if (opts.faceShape && h.faceShapes.includes(opts.faceShape as FaceShape)) match += 2;
    if (opts.texture && h.textures.includes(opts.texture as Hairstyle["textures"][number])) match += 1;
    if (opts.audience && opts.audience !== "any") {
      if (h.audience === opts.audience) match += 1;
      else if (h.audience !== "any") match -= 3;
    }
    return { ...h, match };
  }).sort((a, b) => b.match - a.match);
}

export function audienceFor(profile: Profile | null): "masc" | "fem" | "any" {
  if (profile?.gender === "male") return "masc";
  if (profile?.gender === "female") return "fem";
  return "any";
}

export function demoFace(shape: FaceShape, q: ImageQuality | null, profile: Profile | null, wearsGlasses: boolean): FaceAnalysis {
  const info = FACE_SHAPE_INFO[shape];
  const styles = matchHairstyles({ faceShape: shape, audience: audienceFor(profile) }).slice(0, 4);
  return {
    photo: photoFeedback(q, "פנים ישרות למצלמה, שיער מחוץ לפנים"),
    faceShape: {
      shape,
      confidence: "low",
      explanation: `נבחר ידנית על ידך. ${info.identify} המטרה: ${info.goal}`,
    },
    hairstyles: styles.map((s) => ({ name: s.name, why: s.description, howToAsk: s.barberScript })),
    eyebrows: [
      ...info.brows,
      "לנקות רק שערות בודדות מתחת לקשת ובין הגבות — לא לדלל את הקו העליון.",
      "מסרק גבות + מעט ג׳ל שקוף מסדר את הצורה ב-30 שניות.",
    ],
    grooming: [
      "שגרת עור בסיסית: ניקוי עדין, לחות, SPF בבוקר.",
      profile?.gender === "male"
        ? "זקן/עור: קו לחי וקו צוואר נקיים (שתי אצבעות מעל תפוח האדם) משדרגים מיד."
        : "שפתיים: באלם לחות עם SPF.",
      "שיניים: צחצוח פעמיים ביום + חוט דנטלי — חיוך בריא הוא חלק מהמראה.",
      "שינה ומים משפיעים על מראה העור יותר מכל מוצר.",
    ],
    glasses: {
      relevant: wearsGlasses,
      recommendedFrames: info.glasses,
      avoid: info.avoidGlasses,
    },
    style: [
      "צווארון: חולצות עם צווארון מובנה (פולו, אוקספורד) מוסיפות מסגרת לפנים.",
      "צבעים ליד הפנים: נסו ניטרלים (נייבי, אפור, לבן שבור) ובדקו מול מראה מה מאיר את הפנים.",
      "אקססוריז: שעון פשוט או תכשיט אחד — לא יותר.",
    ],
    actionPlan: [
      { title: "בחירת תסרוקת מה-Gallery", how: "לשמור 2 תסרוקות מומלצות במועדפים ולהראות לספר.", minutes: 5 },
      { title: "סידור גבות", how: "מסרק + פינצטה לשערות בודדות בלבד, באור טוב.", minutes: 10 },
      { title: "שגרת עור בוקר", how: "ניקוי, לחות, SPF.", minutes: 3 },
    ],
  };
}

export function demoHair(opts: {
  length: string;
  texture: string;
  faceShape: string | null;
  q: ImageQuality | null;
  profile: Profile | null;
}): HairAnalysis {
  const styles = matchHairstyles({ faceShape: opts.faceShape, texture: opts.texture, audience: audienceFor(opts.profile) }).slice(0, 4);
  const texLabel: Record<string, string> = { straight: "חלק", wavy: "גלי", curly: "מתולתל", coily: "תלתלים צפופים" };
  const lenLabel: Record<string, string> = { buzz: "קצר מאוד", short: "קצר", medium: "בינוני", long: "ארוך" };
  const curly = opts.texture === "curly" || opts.texture === "coily";
  return {
    photo: photoFeedback(opts.q, "שיער יבש ומסודר, מלפנים ומהצד"),
    length: `${lenLabel[opts.length] ?? opts.length} (לפי בחירתך)`,
    texture: `${texLabel[opts.texture] ?? opts.texture} (לפי בחירתך)`,
    currentCut: "במצב דמו התספורת הנוכחית אינה מזוהה מהתמונה.",
    volume: "לא נבדק במצב דמו",
    frizzDryness: "לא נבדק במצב דמו",
    cutCompatibility: "לא נבדק במצב דמו. הבחירות למטה מבוססות על צורת הפנים והמרקם שבחרת.",
    recommendedStyles: styles.map((s) => ({ name: s.name, why: s.description, howToAsk: s.barberScript })),
    barberScript: styles[0]
      ? `"אני רוצה ${styles[0].name} (${styles[0].nameEn}). ${styles[0].barberScript} חשוב לי שיהיה קל לעיצוב בבוקר."`
      : "",
    routine: [
      { step: "חפיפה", frequency: curly ? "1-2 פעמים בשבוע" : "2-4 פעמים בשבוע", how: "שמפו על הקרקפת בלבד, לעסות בקצות האצבעות." },
      { step: "מרכך", frequency: "בכל חפיפה", how: "על האורכים והקצוות, 2 דקות, לשטוף במים פושרים-קרירים." },
      curly
        ? { step: "הגדרת תלתלים", frequency: "אחרי חפיפה", how: "קרם תלתלים על שיער רטוב מאוד, ללחוץ (scrunch), לייבש עם מפזר או באוויר." }
        : { step: "עיצוב", frequency: "יומי", how: "כמות בגודל אפונה של מוצר, לחמם בין הידיים ולפזר מאחור לפנים." },
      { step: "ניקוי קצוות/תספורת", frequency: opts.length === "long" ? "כל 8-12 שבועות" : "כל 3-5 שבועות", how: "שומר על הצורה ומונע קצוות מפוצלים." },
    ],
    products: [
      { type: "שמפו עדין (ללא סולפטים חזקים)", why: "מנקה בלי לייבש", budgetTip: "מותג סופרפארם/פארם בסיסי מספיק לחלוטין." },
      { type: "מרכך", why: "מונע קשרים ויובש", budgetTip: "אפשר להשתמש במרכך גם כ-leave-in בכמות קטנה." },
      curly
        ? { type: "קרם תלתלים", why: "הגדרה ופחות פריז", budgetTip: "מוצר אחד טוב מספיק — אין צורך בסט שלם." }
        : { type: "משחה מט / קליי", why: "טקסטורה ואחיזה טבעית", budgetTip: "קופסה אחת מחזיקה חודשים." },
    ],
  };
}

const WARM = ["אדום", "כתום", "צהוב", "חום קאמל", "בורדו", "חרדל"];
const COOL = ["כחול", "תכלת", "ירוק", "סגול", "נייבי", "טורקיז"];

export function demoStyle(opts: {
  top: string;
  bottom: string;
  shoes: string;
  occasion: string;
  q: ImageQuality | null;
}): StyleAnalysis {
  const colors = [opts.top, opts.bottom, opts.shoes];
  const neutrals = colors.filter((c) => COLOR_RULES.neutrals.includes(c));
  const strong = colors.filter((c) => !COLOR_RULES.neutrals.includes(c));
  const uniqueStrong = new Set(strong);
  const mixesWarmCool = strong.some((c) => WARM.includes(c)) && strong.some((c) => COOL.includes(c));
  let score = 7;
  const works: string[] = [];
  const improve: string[] = [];
  if (neutrals.length >= 2) {
    score += 1;
    works.push("בסיס ניטרלי — קל להתאמה ונראה מוקפד.");
  }
  if (uniqueStrong.size === 1) {
    score += 1;
    works.push(`צבע חזק אחד (${[...uniqueStrong][0]}) על רקע ניטרלי — בחירה בטוחה ומודרנית.`);
  }
  if (uniqueStrong.size >= 3) {
    score -= 2;
    improve.push("יותר מדי צבעים חזקים — נסו להחליף פריט אחד בניטרלי.");
  }
  if (mixesWarmCool) {
    score -= 1;
    improve.push("שילוב גוונים חמים וקרים יחד — אפשרי, אבל עדיף לשמור על משפחת צבע אחת.");
  }
  if (opts.top === opts.bottom && !COLOR_RULES.neutrals.includes(opts.top)) {
    improve.push("אותו צבע חזק למעלה ולמטה — הוסיפו ניגוד בשכבה או בנעליים.");
  }
  const pair = COLOR_RULES.pairs.find(
    (p) => (p.a === opts.top && p.b === opts.bottom) || (p.b === opts.top && p.a === opts.bottom),
  );
  if (pair) {
    score += 1;
    works.push(`${pair.a} + ${pair.b}: ${pair.note}.`);
  }
  if (!works.length) works.push("שילוב לגיטימי — ההשפעה הגדולה תהיה מהתאמת המידות.");
  score = Math.max(3, Math.min(10, score));
  return {
    photo: photoFeedback(opts.q, "לבוש מלא מהראש עד הנעליים, מול מראה באור יום"),
    items: [
      { item: "חלק עליון", color: opts.top },
      { item: "חלק תחתון", color: opts.bottom },
      { item: "נעליים", color: opts.shoes },
    ],
    colorHarmony: {
      summary: `לפי הצבעים שבחרת (${colors.join(" · ")}) ובהתאם לכללי התאמת צבעים מקובלים.`,
      works,
      improve: improve.length ? improve : ["אפשר לשדרג עם אקססורי אחד בצבע משלים (חגורה, שעון, כובע)."],
    },
    itemMatch: {
      score,
      explanation: "ציון כללי-חוקתי של התאמת הצבעים בין הפריטים בלבד (לא של האדם). במצב דמו הגזרות והמידות לא נבדקות.",
    },
    shoes: COLOR_RULES.neutrals.includes(opts.shoes)
      ? `נעליים ב${opts.shoes} — בחירה גמישה שמתאימה לרוב הלבושים.`
      : `נעליים ב${opts.shoes} הן פריט בולט — שמרו על שאר הלבוש רגוע.`,
    upgrades: [
      "התאמת מידה: מכנס שנגמר מעל הנעל (בלי קפלים מרובים) נראה מוקפד יותר.",
      "הכנסת חולצה חלקית (French tuck) מגדירה מותניים.",
      "שכבה עליונה (אוברשירט/ז׳קט) מוסיפה עומק למראה.",
      ...COLOR_RULES.rules.slice(0, 2),
    ],
    newPieces: [
      { item: "סניקרס לבנות נקיות", why: "מתאימות כמעט לכל לבוש יומיומי", priceRange: "₪200-450" },
      { item: "אוברשירט / ז׳קט קל בצבע ניטרלי", why: "שכבה שמשדרגת טי-שירט פשוטה", priceRange: "₪150-350" },
      { item: "מכנס צ׳ינו בגזרה ישרה", why: "בסיס חכם בין ג׳ינס למכנס מחויט", priceRange: "₪150-300" },
    ],
    inspiration: [
      { name: "Smart Casual מינימליסטי", description: "ניטרלים, גזרות נקיות, פריט מעניין אחד." },
      { name: "Earth Tones", description: "זית, קרם, חום ובז׳ — רגוע ובוגר." },
      { name: opts.occasion ? `לבוש ל: ${opts.occasion}` : "Everyday Clean", description: "פחות פריטים, יותר התאמה." },
    ],
  };
}

export function demoSkin(opts: { skinType: string; concerns: string[]; products: string; minutes: number; saved?: { name: string; category: string }[] }): SkinRoutine {
  const oily = opts.skinType === "oily" || opts.skinType === "combination";
  const dry = opts.skinType === "dry";
  const sensitive = opts.skinType === "sensitive" || opts.concerns.some((c) => c.includes("רגישות"));
  const acne = opts.concerns.some((c) => c.includes("אקנה"));
  const saved = opts.saved ?? [];
  const has = (cat: string) => saved.find((p) => p.category === cat)?.name ?? "";
  const productList = opts.products
    .split(/[\n,]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 10);
  type Item = SkinRoutine["morning"][number];
  const item = (step: string, product: string, purpose: string, how: string, when: string, minutes: number, precautions = "", dupCat = ""): Item => ({
    step, product, purpose, how, when, precautions, duplicateOf: dupCat ? has(dupCat) : "", minutes,
  });
  const cleanser = item("ניקוי", oily ? "ג׳ל ניקוי עדין" : "ניקוי קרמי עדין", "מסיר שמן, זיעה ולכלוך בלי לייבש", "מים פושרים, עיסוי בקצות האצבעות 30-60 שניות, ייבוש בטפיחות", "בוקר וערב", 1, "בלי לשפשף ובלי ספוגים קשים", "cleanser");
  const moist = item("לחות", oily ? "ג׳ל לחות קליל (oil-free)" : dry ? "קרם לחות עשיר" : "קרם לחות קל", "שומר על מחסום העור", "כמות בגודל אפונה על עור מעט לח", "אחרי ניקוי", 1, "", "moisturizer");
  const spf = item("SPF 30+", sensitive ? "SPF מינרלי" : "SPF רחב טווח", "הגנה מקרינת UV", "שתי אצבעות לפנים ולצוואר, חידוש כל שעתיים בחוץ", "בבוקר כשיש חשיפה לשמש", 1, "", "spf");
  const morning = [cleanser, moist, spf];
  const evening = [
    { ...cleanser, when: "ערב" },
    ...(acne && !sensitive
      ? [item("טיפול ממוקד (אופציונלי)", "מוצר ללא מרשם לפצעונים", "תמיכה בעור נוטה לפצעונים", "שכבה דקה, 2-3 ערבים בשבוע בהתחלה", "ערב", 1, "מתחילים לאט. גירוי מתמשך: להפסיק ולהתייעץ עם רופא/ת עור", "serum")]
      : []),
    { ...moist, when: "ערב" },
  ];
  const afterWorkout = [
    item("שטיפה", "ניקוי עדין או מים", "הסרת זיעה", "שטיפה קצרה כשאפשר אחרי זיעה מרובה", "אחרי אימון", 1, "", "cleanser"),
    item("לחות קלה", "קרם לחות קליל", "החזרת לחות", "שכבה דקה", "אחרי השטיפה", 1, "", "moisturizer"),
  ];
  const beforeEvent = [
    item("ניקוי ולחות", "המוצרים הרגילים שלך", "עור רגוע ומוכן", "השגרה הרגילה, בלי מוצרים חדשים", "שעה-שעתיים לפני", 3, "לא לנסות מוצר חדש ביום האירוע"),
    ...(spf ? [{ ...spf, when: "אם האירוע ביום או בחוץ" }] : []),
  ];
  const total = [...morning, ...evening].reduce((a, b) => a + b.minutes, 0);
  return {
    summary: `שגרה של ~${total} דקות ביום לעור ${skinLabel(opts.skinType)}. בסיס פשוט ועקבי עדיף על הרבה מוצרים.`,
    morning,
    evening,
    weekly: sensitive ? [] : [item("פילינג עדין (אופציונלי)", "פילינג כימי עדין בריכוז נמוך", "הסרת תאים מתים", "פעם בשבוע בערב, ואז לחות", "פעם בשבוע", 2, "לא על עור פצוע, שרוף או מגורה. לא לשלב עם עוד מוצרים מגרים")],
    afterWorkout,
    beforeEvent,
    productNotes: productList.map((p) => ({
      product: p,
      verdict: "unknown" as const,
      note: "במצב דמו המוצר לא מנותח. אם הוא לא מגרה ומתאים לאחד הצעדים, אפשר להשאיר.",
    })),
    tips: [
      "מוצר חדש אחד בכל פעם, ולתת לו כמה שבועות.",
      "בדיקת מוצר: מעט באזור קטן לפני שימוש בכל הפנים.",
      "לא לסחוט פצעונים, זה מגביר סיכון לכתמים.",
      "שינה, שתייה רגילה ותזונה מגוונת משפיעות על העור.",
    ],
    dermatologistNote: "אקנה כואב או עמוק, פריחה מתמשכת, שינוי בשומה, או שאין שיפור אחרי 8-12 שבועות: כדאי לפנות לרופא/ת עור.",
  };
}

function skinLabel(t: string) {
  return (
    { oily: "שמנוני", dry: "יבש", combination: "מעורב", normal: "רגיל", sensitive: "רגיש", unknown: "לא ידוע" } as Record<string, string>
  )[t] ?? t;
}

/** Simple keyword-based demo coach. Clearly labeled as not AI. */
export function demoCoachReply(text: string, profileName?: string): string {
  const t = text.toLowerCase();
  const name = profileName ? `${profileName}, ` : "";
  const pick = (k: string[]) => k.some((w) => t.includes(w));
  let body: string;
  if (pick(["עור", "פצע", "אקנה", "קרם", "spf", "טיפוח"]))
    body = `**שגרת עור בסיסית שעובדת:**\n- בוקר: ניקוי עדין → לחות → SPF 30+ (3 דק׳)\n- ערב: ניקוי → לחות (3 דק׳)\n- מוצר חדש אחד בכל פעם, ולתת לו שבועיים.\n\nלמה? מחסום עור בריא + הגנה מהשמש = 80% מהתוצאה. אם יש בעיית עור מתמשכת — כדאי רופא/ת עור.`;
  else if (pick(["שיער", "תספורת", "ספר", "תסרוקת"]))
    body = `**לבחירת תספורת:**\n1. הריצו ניתוח פנים או בחרו צורת פנים ידנית.\n2. ב-Haircut Gallery סננו לפי "מומלץ לי" ושמרו 2 מועדפים.\n3. הראו לספר את "מה לבקש מהספר".\n\nטיפ: לצלם את התוצאה ולשמור ב"תספורות שניסיתי".`;
  else if (pick(["אימון", "כושר", "שריר", "כוח", "ספורט"]))
    body = `**אימון כוח למתחילים (25 דק׳, 3× בשבוע):**\n- סקוואט 3×10\n- שכיבות סמיכה (גם על ברכיים) 3×8\n- חתירה עם גומייה/תיק 3×10\n- פלאנק 3×30 שנ׳\n\nכל שבוע — להוסיף חזרה אחת. בריאות וכוח לפני מראה.`;
  else if (pick(["שינה", "עייף", "לישון"]))
    body = `**שינה טובה יותר:**\n- שעת שינה קבועה (±30 דק׳)\n- בלי קפאין אחרי 14:00\n- 30 דק׳ בלי מסכים לפני השינה\n- 10 דק׳ אור יום בבוקר\n\nשינה היא ה-Glow Up הכי משתלם: עור, אנרגיה, מצב רוח.`;
  else if (pick(["יציבה", "גב", "כתפיים", "צוואר"]))
    body = `**שגרת יציבה 5 דקות:**\n- Chin tucks ×10\n- Wall angels ×10\n- מתיחת חזה בפתח דלת 2×30 שנ׳\n\nבנוסף: תזכורת 3× ביום — אוזניים מעל הכתפיים, כתפיים למטה ואחורה.`;
  else if (pick(["בגד", "סטייל", "לבוש", "צבע", "אאוטפיט", "outfit"]))
    body = `**סטייל בלי לבזבז:**\n- התאמת מידה > מותג\n- עד 3 צבעים בלבוש, רובם ניטרלים\n- נעליים נקיות משדרגות כל לבוש\n\nנסו את ה-Style Analyzer עם תמונה של לבוש מלא.`;
  else if (pick(["תזונה", "אוכל", "דיאטה", "משקל"]))
    body = `**הרגלי תזונה בריאים (בלי דיאטות):**\n- ירק/פרי בכל ארוחה\n- חלבון בכל ארוחה (ביצים, קטניות, יוגורט, עוף, טופו)\n- 8 כוסות מים\n- לא לדלג על ארוחת בוקר אם זה גורם לרעב בהמשך\n\nאני לא ממליץ על דיאטות קיצוניות — המטרה היא אנרגיה ובריאות.`;
  else if (pick(["ביטחון", "חרדה", "בטוח", "מרגיש"]))
    body = `**ביטחון נבנה מפעולות קטנות:**\n- 3 הצלחות ביום (גם קטנות)\n- עמידה זקופה וקשר עין בשיחה אחת\n- להשוות רק לעצמך מלפני חודש\n\nאת/ה כבר עושה צעד חשוב בזה שאת/ה כאן.`;
  else
    body = `אני יכול לעזור עם **טיפוח עור, שיער, סטייל, כושר, יציבה, שינה ותזונה בריאה**.\nנסו לשאול למשל: "איך לבנות שגרת עור פשוטה?" או "תן לי אימון כוח למתחילים".`;
  return `${name}${body}\n\n_⚠️ מצב דמו: זו תשובה מוכנה מראש לפי מילות מפתח, לא תשובת AI. להפעלת המאמן האמיתי יש להגדיר ANTHROPIC_API_KEY._`;
}
