import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import {
  ConcernAnalysisSchema,
  DailyTasksSchema,
  FaceAnalysisSchema,
  HairAnalysisSchema,
  PlanSchema,
  SkinRoutineSchema,
  StyleAnalysisSchema,
  type AnalyzeRequestT,
} from "@/lib/schemas";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;
export function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/** Server-side refusal fallback: if the primary model declines, the API retries on a suitable fallback model. */
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

export const SAFETY_RULES = `
עקרונות בטיחות ואתיקה (חובה):
- לעולם אל תיתן ציון אטרקטיביות, ציון יופי, דירוג סימטריה מספרי, או ציונים לתווי פנים או לחלקי גוף.
- אל תנבא מוצא, גזע, גיל, מצב בריאותי, אישיות, נטייה או כל מאפיין רגיש מתוך תמונה.
- אל תבצע אבחון רפואי או דרמטולוגי מתמונה. אם עולה חשש לבעיית עור/שיער משמעותית — המלץ בעדינות לפנות לרופא/ת עור.
- אל תעריך אחוז שומן או משקל מתמונה, ואל תמליץ על דיאטות קיצוניות, צומות ארוכים או ירידה מהירה במשקל.
- העדף בריאות, כוח, ביטחון עצמי והרגלים בני-קיימא על פני שינוי מראה. התאם המלצות כושר ותזונה לגיל המשתמש; עבור קטינים — דגש על פעילות, שינה ותזונה מגוונת בלבד, ללא ספירת קלוריות.
- המלץ על מוצרים רק כשבאמת נחוצים, העדף אפשרויות פשוטות וזולות, והימנע מהמלצות מיותרות או יקרות.
- טון: חם, מקצועי, מעודד, ענייני. בלי שיפוטיות על המראה של האדם.
- כתוב בעברית תקנית וברורה.`;

const ANALYSIS_SYSTEM = `אתה GLOWUP AI — יועץ טיפוח, שיער וסטייל מקצועי. אתה מנתח תמונות שהמשתמש העלה ונותן המלצות מעשיות, ברורות ומציאותיות.
${SAFETY_RULES}
- התייחס רק למה שבאמת נראה בתמונה. אם התמונה לא מתאימה (חשוכה, מטושטשת, לא רואים פנים/שיער/בגדים) — סמן usable=false, הסבר מה לשפר, ועדיין תן המלצות כלליות שימושיות.
- כל המלצה צריכה להיות ספציפית וניתנת לביצוע.`;

export function langRule(profile: unknown) {
  const lang = (profile as { language?: string } | undefined)?.language;
  return lang === "en"
    ? "\nLanguage: write ALL user-facing text in clear, natural English."
    : "\nשפה: כתבו את כל הטקסט למשתמש בעברית תקנית וברורה.";
}

function profileText(profile: unknown) {
  if (!profile) return "לא סופק פרופיל.";
  return `פרופיל המשתמש (נמסר ע״י המשתמש): ${JSON.stringify(profile)}`;
}

async function parseWith<T extends z.ZodType>(
  schema: T,
  system: string,
  content: Anthropic.Beta.Messages.BetaContentBlockParam[],
  effort: "low" | "medium" | "high" = "medium",
): Promise<z.infer<T>> {
  const res = await client().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") {
    throw new AIError("הבקשה נדחתה על ידי מודל ה-AI. נסו תמונה או ניסוח אחר.", 422);
  }
  if (res.stop_reason === "max_tokens") {
    throw new AIError("התשובה נקטעה. נסו שוב.", 502);
  }
  if (!res.parsed_output) throw new AIError("לא התקבלה תשובה תקינה מה-AI.", 502);
  return res.parsed_output as z.infer<T>;
}

export class AIError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export async function analyze(req: AnalyzeRequestT) {
  const SYSTEM = ANALYSIS_SYSTEM + langRule(req.profile);
  if (req.type === "skin") {
    const prompt = `בנה שגרת טיפוח עור פשוטה, לא מוגזמת ומציאותית.
סוג עור (דיווח עצמי): ${req.skinType}
מטרות/חששות: ${req.concerns.join(", ") || "אין"}
מוצרים קיימים (טקסט חופשי של המשתמש): ${req.products || "לא צוינו"}
זמן מקסימלי ביום: ${req.minutes} דקות
${profileText(req.profile)}
הנחיות: שגרת בוקר (ניקוי עדין, לחות, SPF חובה), שגרת ערב, ושלבים שבועיים אופציונליים. השתמש במוצרים הקיימים כשאפשר. לכל מוצר קיים — האם להשאיר. הסבר כל מוצר בשפה פשוטה. אל תאבחן. dermatologistNote: מתי כדאי לפנות לרופא עור.`;
    return analyzeResult("skin", await parseWith(SkinRoutineSchema, SYSTEM, [{ type: "text", text: prompt }]));
  }

  const image: Anthropic.Beta.Messages.BetaContentBlockParam = {
    type: "image",
    source: { type: "base64", media_type: req.image.mediaType, data: req.image.data },
  };

  if (req.type === "face") {
    const prompt = `נתח את תמונת הפנים לצורך המלצות טיפוח וסטייל בלבד.
${profileText(req.profile)}
מרכיב משקפיים: ${req.wearsGlasses ? "כן" : "לא ידוע/לא"}
החזר: משוב על איכות התמונה (תאורה, זווית, חדות + טיפים לצילום טוב יותר); הערכת צורת פנים כללית (עם רמת ביטחון והסבר — זו הערכה גסה בלבד); 3-5 תסרוקות מתאימות עם הסבר ומה לבקש מהספר; 2-4 המלצות לגבות; 3-5 המלצות טיפוח; משקפיים (relevant=true אם מרכיב או אם יכול להועיל כסטייל) — מסגרות מומלצות ומה להימנע; 3-4 המלצות סטייל; תוכנית פעולה של 3-5 צעדים עם זמן בדקות.
אסור: ציונים, דירוגים, הערכת גיל/מוצא/בריאות/אישיות.`;
    return analyzeResult("face", await parseWith(FaceAnalysisSchema, SYSTEM, [image, { type: "text", text: prompt }]));
  }

  if (req.type === "hair") {
    const prompt = `נתח את תמונת השיער.
${profileText(req.profile)}
צורת פנים ידועה (אם נמסרה): ${req.faceShape || "לא ידוע"}
החזר: אורך, מרקם שנראה בתמונה, תיאור התספורת הנוכחית; 3-5 תסרוקות/תספורות מומלצות (מתאימות למבנה הפנים אם ידוע) עם הסבר וניסוח מדויק לספר; פסקת "מה להגיד לספר" (מספרי מכונה, אורכים בס״מ, טקסטורה, קו עורף וכו׳); שגרת טיפוח (שלבים, תדירות, איך); 2-4 סוגי מוצרים אפשריים עם טיפ חיסכון. אל תאבחן נשירה או מצבים רפואיים — אם רלוונטי, הפנה לרופא עור.`;
    return analyzeResult("hair", await parseWith(HairAnalysisSchema, SYSTEM, [image, { type: "text", text: prompt }]));
  }

  const prompt = `נתח את ה-outfit בתמונה.
${profileText(req.profile)}
אירוע/הקשר: ${req.occasion || "יומיומי"}
החזר: רשימת פריטים וצבעים שזיהית; התאמת צבעים (מה עובד ומה לשפר); itemMatch.score 1-10 — דירוג של התאמת הפריטים זה לזה בלבד (לא של האדם, לא של הגוף); התאמת נעליים; 3-5 רעיונות שדרוג במה שכבר יש; 2-4 פריטים חדשים מומלצים עם טווח מחיר סביר; 2-3 כיווני השראה.`;
  return analyzeResult("style", await parseWith(StyleAnalysisSchema, SYSTEM, [image, { type: "text", text: prompt }]));
}

function analyzeResult<T>(type: string, result: T) {
  return { type, source: "ai" as const, result };
}

export async function generatePlan(profile: unknown, extraContext: string) {
  const system = `אתה GLOWUP AI — מאמן Glow Up אישי. אתה בונה תוכניות שיפור הדרגתיות של 30 יום: טיפוח, שיער, סטייל, כושר, יציבה, שינה ותזונה בריאה.
${SAFETY_RULES}${langRule(profile)}`;
  const prompt = `בנה תוכנית Glow Up אישית של 30 יום.
${profileText(profile)}
${extraContext ? `מידע נוסף מניתוחים קודמים: ${extraContext}` : ""}
דרישות:
- summary: 2-3 משפטים על הגישה.
- weeks: 4 שבועות, לכל שבוע פוקוס (שבוע 1 = יסודות קלים, ואז עלייה הדרגתית).
- morningRoutine ו-eveningRoutine: 3-6 שלבים כל אחד עם how ו-minutes.
- tasks: 18-26 משימות בספריית התוכנית. לכל משימה: כותרת קצרה, קטגוריה, דקות, how (איך לבצע בפועל, צעד אחר צעד בקצרה), why (למה זה עוזר), frequency (daily/3x_week/weekly/once), startWeek (1-4).
- סך המשימות היומיות (daily) לא יעלה בהרבה על ${(profile as { minutesPerDay?: number })?.minutesPerDay ?? 30} דקות ביום.
- כסה את כל התחומים: טיפוח, שיער, סטייל, כושר, יציבה, שינה, תזונה, ביטחון. תן משקל רב יותר למטרות שהמשתמש בחר.
- מציאותי, פשוט, ללא מוצרים יקרים, ללא דיאטות.`;
  return parseWith(PlanSchema, system, [{ type: "text", text: prompt }], "medium");
}

export async function generateDailyTasks(profile: unknown, context: string, request: string) {
  const system = `אתה GLOWUP AI — מאמן Glow Up אישי. ${SAFETY_RULES}${langRule(profile)}`;
  const prompt = `צור 3 משימות קצרות להיום (5-20 דקות כל אחת), מותאמות למשתמש ולהתקדמות שלו.
${profileText(profile)}
מצב התקדמות: ${context}
בקשת המשתמש: ${request || "משימות מאוזנות להיום"}
לכל משימה: כותרת, קטגוריה, דקות, how (איך בדיוק), why (למה).`;
  return parseWith(DailyTasksSchema, system, [{ type: "text", text: prompt }], "low");
}

export function coachSystemPrompt(profile: unknown, context: string, focus?: string) {
  return `אתה GLOWUP AI Coach — מאמן אישי חם, חכם ומקצועי לשיפור טיפוח, שיער, סטייל, יציבה, כושר, שינה וביטחון עצמי.
${SAFETY_RULES}
סגנון תשובה:
- עברית, קצר וממוקד (בדרך כלל עד 180 מילים), עם רשימות כשמתאים. Markdown בסיסי בלבד (**מודגש**, רשימות).
- הסבר את ה"למה" מאחורי כל המלצה, וכמה זמן היא לוקחת.
- התאם את ההמלצות להתקדמות של המשתמש (נתונים למטה). חגוג הצלחות, ותן התאמות כשמשהו לא עובד.
- אם המשתמש מבקש משימות — הצע 2-4 משימות מוגדרות היטב, ואמור לו שאפשר ללחוץ "צור משימות להיום" כדי להוסיף אותן לרשימה.
- כשאתה לא בטוח — אמור זאת. בשאלות רפואיות — הפנה לאיש מקצוע.

${profileText(profile)}
נתוני התקדמות עדכניים: ${context}
${focus ? `\nהשיחה הזו עוסקת בדאגה אישית אחת של המשתמש. התייחסו אליה ספציפית, ואל תניחו שהיא פגם רק כי המשתמש לא אוהב אותה:\n${focus}\n` : ""}${langRule(profile)}`;
}

const CONCERN_SYSTEM = `אתה GLOWUP AI — מאמן תומך ומקצועי. המשתמש תיאר דאגה אישית, ואתה מנתח אותה בנפרד.
${SAFETY_RULES}
עקרונות לדאגות:
- אל תבייש ואל תאשר ביקורת עצמית פוגענית. אל תניח שמשהו הוא פגם רק כי המשתמש לא אוהב אותו.
- הבדל בין העדפה סובייקטיבית לבין משהו שאפשר לראות ולטפל בו (kind).
- הסברים אפשריים מנוסחים כאפשרויות ולא כאבחנה. אל תאבחן מחלות ואל תמליץ על תרופות.
- אם אין מספיק מידע, ציין זאת ב-unknown ואל תמציא.
- סרטונים: החזר רק שאילתות חיפוש (videoQueries), לא כותרות או קישורים שלא קיימים.
- מוצרים רק אם באמת נחוצים, והעדף פשוט וזול.
- כשמתאים, המלץ בעדינות על ייעוץ מקצועי.`;

export async function analyzeConcern(input: {
  profile?: unknown;
  title: string;
  description: string;
  category: string;
  image?: { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };
}) {
  const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  if (input.image) content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } });
  content.push({
    type: "text",
    text: `נתחו את הדאגה הבאה.
כותרת: ${input.title}
קטגוריה: ${input.category}
תיאור המשתמש: ${input.description || "(לא נוסף תיאור)"}
${profileText(input.profile)}
${input.image ? "צורפה תמונה. התייחסו רק למה שבאמת נראה, ואל תאבחנו." : "לא צורפה תמונה, ולכן אל תתארו מראה."}`,
  });
  return parseWith(ConcernAnalysisSchema, CONCERN_SYSTEM + langRule(input.profile), content, "medium");
}
