import type { Category, Frequency, Goal, Plan, PlanTask, Profile, RoutineStep } from "./types";

type LibGoal = "skin" | "hair" | "style" | "fitness" | "posture" | "sleep" | "confidence";
/** Maps the user-facing goals to the task-library groups. */
export const GOAL_TO_LIB: Record<Goal, LibGoal[]> = {
  grooming: ["style", "skin"],
  haircut: ["hair"],
  skin: ["skin"],
  hairHealth: ["hair"],
  muscle: ["fitness"],
  posture: ["posture"],
  growth: ["sleep"],
  sleep: ["sleep"],
  nutrition: [],
  puffiness: ["skin", "sleep"],
  style: ["style"],
  confidence: ["confidence"],
};
import type { PlanAI } from "./schemas";
import { dateKey, daysBetween, uid } from "./utils";

type LibTask = Omit<PlanTask, "id"> & { key: string; goals: (LibGoal | "core")[]; priority: number };

/** Curated library used to build the Demo plan (and as fallback). */
export const TASK_LIBRARY: LibTask[] = [
  // ---- core (everyone)
  { key: "spf", title: "מריחת SPF 30+ בבוקר", category: "skin", minutes: 1, frequency: "daily", startWeek: 1, goals: ["core"], priority: 10,
    how: "כמות של שתי אצבעות על פנים, צוואר ואוזניים אחרי הלחות. לחדש כל שעתיים בחוץ.", why: "ההגנה החשובה ביותר לעור — מונעת כתמים, הזדקנות ונזקי שמש." },
  { key: "cleanse-pm", title: "ניקוי פנים עדין בערב", category: "skin", minutes: 2, frequency: "daily", startWeek: 1, goals: ["core"], priority: 9,
    how: "מים פושרים + תכשיר ניקוי עדין, עיסוי 30-60 שניות, שטיפה וייבוש בטפיחות.", why: "מסיר שמן, זיעה ולכלוך שהצטברו ביום ומאפשר לעור להתחדש בלילה." },
  { key: "moisturize", title: "קרם לחות בוקר וערב", category: "skin", minutes: 1, frequency: "daily", startWeek: 1, goals: ["core"], priority: 8,
    how: "כמות בגודל אפונה, למרוח על עור מעט לח לאחר הניקוי.", why: "שומר על מחסום העור, מפחית יובש וגם שמנוניות יתר." },
  { key: "water", title: "8 כוסות מים", category: "nutrition", minutes: 0, frequency: "daily", startWeek: 1, goals: ["core"], priority: 7,
    how: "בקבוק ליד העבודה/לימודים. כוס אחת עם כל ארוחה ובין ארוחות.", why: "משפיע על אנרגיה, ריכוז, ומצב העור." },
  { key: "sleep-window", title: "שעת שינה קבועה", category: "sleep", minutes: 0, frequency: "daily", startWeek: 1, goals: ["core"], priority: 9,
    how: "לבחור שעה קבועה (±30 דק׳) ולהתכונן 30 דקות לפני: אור עמום, בלי מסכים במיטה.", why: "שינה איכותית היא ה-Glow Up הכי חזק: עור, הורמונים, מצב רוח והתאוששות." },
  { key: "walk", title: "הליכה של 20 דקות", category: "fitness", minutes: 20, frequency: "daily", startWeek: 1, goals: ["core"], priority: 6,
    how: "בקצב שמאפשר לדבר אבל מרגיש מאמץ קל. אפשר לחלק ל-2×10 דקות.", why: "משפר כושר, שינה ומצב רוח — בלי ציוד ובלי עומס." },
  { key: "veggies", title: "ירק או פרי בכל ארוחה", category: "nutrition", minutes: 0, frequency: "daily", startWeek: 2, goals: ["core"], priority: 5,
    how: "להוסיף ירק אחד לכל ארוחה — סלט קטן, מלפפון, פרי ליד.", why: "סיבים, ויטמינים ונוגדי חמצון לעור ולאנרגיה — בלי דיאטה." },
  { key: "pillow", title: "החלפת ציפית", category: "skin", minutes: 3, frequency: "weekly", startWeek: 1, goals: ["core"], priority: 4,
    how: "להחליף ציפית פעם-פעמיים בשבוע.", why: "מפחית הצטברות שמן וחיידקים שיכולים לגרום לפצעונים." },

  // ---- skin
  { key: "skin-check", title: "בדיקת מוצרים קיימים", category: "skin", minutes: 10, frequency: "once", startWeek: 1, goals: ["skin"], priority: 6,
    how: "לאסוף את כל המוצרים, לזרוק פגי תוקף, ולהזין אותם באזור 'טיפוח עור' באפליקציה.", why: "פחות זה יותר — שגרה פשוטה ועקבית מנצחת מדף עמוס." },
  { key: "exfoliate", title: "פילינג עדין", category: "skin", minutes: 3, frequency: "weekly", startWeek: 3, goals: ["skin"], priority: 4,
    how: "פעם בשבוע — פילינג כימי עדין (למשל חומצה לקטית/BHA בריכוז נמוך) במקום ניקוי. לא לשפשף.", why: "מסיר תאים מתים ומשפר מרקם. יותר מדי — מגרה את העור." },
  { key: "hands-off", title: "לא לגעת בפנים", category: "skin", minutes: 0, frequency: "daily", startWeek: 2, goals: ["skin"], priority: 3,
    how: "לשים לב לרגעים שבהם נוגעים בפנים (טלפון, מחשב) ולהחליף בהרגל אחר.", why: "מפחית העברת לכלוך וחיידקים, ומונע החמרה של פצעונים." },

  // ---- hair
  { key: "hair-analysis", title: "ניתוח שיער + בחירת תספורת", category: "hair", minutes: 10, frequency: "once", startWeek: 1, goals: ["hair"], priority: 7,
    how: "להעלות תמונת שיער באזור 'שיער', לבחור 2 תספורות מה-Gallery ולשמור במועדפים.", why: "תספורת שמתאימה למבנה הפנים היא שינוי מהיר עם השפעה גדולה." },
  { key: "barber", title: "תספורת אצל ספר/ית", category: "hair", minutes: 45, frequency: "once", startWeek: 2, goals: ["hair"], priority: 6,
    how: "לקבוע תור, להראות לספר את 'מה לבקש מהספר' מהאפליקציה, ולצלם אחרי.", why: "תספורת נקייה ומתאימה = מראה מוקפד מיידי." },
  { key: "hair-routine", title: "שגרת שיער: שמפו + מרכך", category: "hair", minutes: 5, frequency: "3x_week", startWeek: 1, goals: ["hair"], priority: 5,
    how: "שמפו על הקרקפת בלבד, מרכך על הקצוות. מים לא חמים מדי.", why: "חפיפה יומית מייבשת; 2-4 פעמים בשבוע מתאים לרוב סוגי השיער." },
  { key: "hair-style", title: "תרגול עיצוב שיער", category: "hair", minutes: 5, frequency: "3x_week", startWeek: 3, goals: ["hair"], priority: 4,
    how: "לנסות את טכניקת העיצוב שהומלצה לתספורת (פן, מוצר בכמות קטנה). לצלם תוצאה.", why: "אותה תספורת נראית אחרת לגמרי עם 3 דקות עיצוב נכון." },

  // ---- style
  { key: "closet", title: "סדר בארון: מה עובד", category: "style", minutes: 25, frequency: "once", startWeek: 1, goals: ["style"], priority: 6,
    how: "להוציא פריטים שלא לבשת שנה, לא במידה או פגומים. לסמן 10 פריטים בסיסיים שאוהבים.", why: "ארון קטן וברור מקל על התלבשות טובה כל יום." },
  { key: "outfit-check", title: "Outfit Check באפליקציה", category: "style", minutes: 5, frequency: "weekly", startWeek: 1, goals: ["style"], priority: 5,
    how: "לצלם לבוש מלא מול מראה באור טבעי ולהעלות ל-Style Analyzer.", why: "משוב על התאמת צבעים ופריטים מלמד מה עובד עליך." },
  { key: "fit", title: "תיקון מידה לפריט אחד", category: "style", minutes: 20, frequency: "once", startWeek: 3, goals: ["style"], priority: 4,
    how: "לבחור מכנס/חולצה שכמעט מושלמים ולקחת לתופרת לקיצור/הצרה.", why: "התאמה נכונה למידה חשובה יותר ממותג או מחיר." },
  { key: "outfit-plan", title: "תכנון לבוש מראש", category: "style", minutes: 3, frequency: "daily", startWeek: 2, goals: ["style"], priority: 3,
    how: "בערב לבחור את הלבוש של מחר, כולל נעליים.", why: "חוסך זמן בבוקר ומוביל לבחירות טובות יותר." },

  // ---- fitness
  { key: "strength", title: "אימון כוח בסיסי", category: "fitness", minutes: 25, frequency: "3x_week", startWeek: 1, goals: ["fitness"], priority: 7,
    how: "3 סבבים: סקוואט 10, שכיבות סמיכה (גם על ברכיים) 8, חתירה עם גומייה/תיק 10, פלאנק 30 שנ׳. לתעד באזור כושר.", why: "כוח משפר יציבה, ביטחון, מטבוליזם ובריאות עצם." },
  { key: "progressive", title: "העלאת עומס הדרגתית", category: "fitness", minutes: 0, frequency: "weekly", startWeek: 3, goals: ["fitness"], priority: 4,
    how: "בתרגיל אחד — להוסיף חזרה או מעט משקל לעומת השבוע הקודם (רק אם הטכניקה טובה).", why: "עומס הדרגתי הוא המנוע של התקדמות בכוח." },
  { key: "stretch", title: "מתיחות ערב", category: "fitness", minutes: 8, frequency: "daily", startWeek: 2, goals: ["fitness", "posture"], priority: 4,
    how: "ירכיים, חזה, גב תחתון — 30-45 שנ׳ לכל מתיחה, נשימות איטיות.", why: "גמישות, הרפיה לפני שינה ופחות כאבים." },

  // ---- posture
  { key: "posture-routine", title: "שגרת יציבה 5 דקות", category: "posture", minutes: 5, frequency: "daily", startWeek: 1, goals: ["posture"], priority: 6,
    how: "Chin tucks ×10, Wall angels ×10, פתיחת חזה בפתח דלת 30 שנ׳ ×2.", why: "מחזק את שרירי הגב העליון ומשפר עמידה ונשימה." },
  { key: "posture-reminder", title: "בדיקת יציבה 3× ביום", category: "posture", minutes: 1, frequency: "daily", startWeek: 1, goals: ["posture"], priority: 5,
    how: "תזכורת בטלפון: אוזניים מעל הכתפיים, כתפיים למטה ואחורה, נשימה עמוקה.", why: "יציבה היא הרגל — תזכורות קצרות בונות מודעות." },
  { key: "desk", title: "סידור עמדת עבודה", category: "posture", minutes: 15, frequency: "once", startWeek: 1, goals: ["posture"], priority: 4,
    how: "מסך בגובה העיניים, כפות רגליים על הרצפה, מרפקים ב-90°. הפסקה כל 45 דק׳.", why: "סביבה נכונה מורידה עומס מהצוואר והגב." },

  // ---- sleep
  { key: "screens", title: "בלי מסכים 30 דק׳ לפני שינה", category: "sleep", minutes: 0, frequency: "daily", startWeek: 2, goals: ["sleep"], priority: 5,
    how: "להטעין את הטלפון מחוץ למיטה. במקום — קריאה, מקלחת, מתיחות.", why: "אור ותוכן מגרה מעכבים הירדמות ופוגעים באיכות השינה." },
  { key: "caffeine", title: "בלי קפאין אחרי 14:00", category: "sleep", minutes: 0, frequency: "daily", startWeek: 2, goals: ["sleep"], priority: 4,
    how: "להחליף קפה/אנרג׳י אחר הצהריים בתה צמחים או מים.", why: "קפאין נשאר בגוף שעות ופוגע בשינה עמוקה." },
  { key: "morning-light", title: "אור יום בבוקר", category: "sleep", minutes: 10, frequency: "daily", startWeek: 3, goals: ["sleep"], priority: 3,
    how: "10 דקות בחוץ או ליד חלון בשעה הראשונה אחרי היקיצה.", why: "מכייל את השעון הביולוגי ומשפר הירדמות בערב." },

  // ---- confidence / mindset
  { key: "wins", title: "3 הצלחות של היום", category: "mindset", minutes: 3, frequency: "daily", startWeek: 1, goals: ["confidence", "core"], priority: 5,
    how: "בערב לכתוב 3 דברים שהצלחת בהם — גם קטנים. אפשר בהערת ה-Check-in.", why: "בונה ביטחון ומחזק תחושת התקדמות." },
  { key: "posture-power", title: "שיחה עם קשר עין", category: "mindset", minutes: 0, frequency: "3x_week", startWeek: 2, goals: ["confidence"], priority: 3,
    how: "בשיחה אחת היום — לעמוד זקוף, לשמור קשר עין ולדבר לאט.", why: "שפת גוף בטוחה משפיעה על איך שמרגישים ואיך שנתפסים." },
  { key: "progress-photo", title: "תמונת התקדמות (אופציונלי)", category: "mindset", minutes: 2, frequency: "weekly", startWeek: 1, goals: ["core"], priority: 2,
    how: "באותה תאורה וזווית — לשמור באזור 'התקדמות'. פרטי ונשמר רק במכשיר.", why: "מאפשר לראות שינוי הדרגתי שקשה להבחין בו מיום ליום." },
];

const DEFAULT_MORNING: RoutineStep[] = [
  { step: "כוס מים", how: "כוס מים מיד אחרי הקימה", minutes: 1 },
  { step: "שטיפת פנים", how: "מים פושרים או ניקוי עדין לעור שמנוני", minutes: 1 },
  { step: "לחות", how: "קרם לחות קל בגודל אפונה", minutes: 1 },
  { step: "SPF 30+", how: "שתי אצבעות לפנים ולצוואר", minutes: 1 },
  { step: "שיער + לבוש", how: "עיצוב קצר ולבוש שתוכנן מראש", minutes: 5 },
];

const DEFAULT_EVENING: RoutineStep[] = [
  { step: "ניקוי פנים", how: "תכשיר ניקוי עדין, 60 שנ׳ עיסוי", minutes: 2 },
  { step: "לחות", how: "קרם לחות (עשיר יותר לעור יבש)", minutes: 1 },
  { step: "מתיחות / יציבה", how: "5-8 דקות מתיחות רגועות", minutes: 6 },
  { step: "הכנה לשינה", how: "מסכים כבויים, אור עמום, תכנון מחר", minutes: 5 },
];

const WEEK_FOCUS = [
  "יסודות: שגרת עור בסיסית, שינה קבועה ותנועה יומית",
  "הרחבה: שיער, ארון בגדים והרגלי יציבה",
  "העמקה: אימוני כוח עקביים, פילינג ועיצוב שיער",
  "קיבוע: חיזוק ההרגלים שעבדו והתאמת התוכנית להמשך",
];

/** Spread tasks across 30 days according to frequency & start week, within daily time budget. */
export function schedule(tasks: PlanTask[], minutesPerDay: number) {
  const days: { day: number; taskIds: string[] }[] = [];
  const onceSlots: Record<number, number> = {};
  const onceDay = new Map<string, number>();
  // place "once" tasks on distinct days within their start week
  for (const t of tasks.filter((t) => t.frequency === "once")) {
    const base = (Math.min(Math.max(t.startWeek, 1), 4) - 1) * 7 + 1;
    let d = base + 1;
    while ((onceSlots[d] ?? 0) >= 1 && d < base + 6) d++;
    onceSlots[d] = (onceSlots[d] ?? 0) + 1;
    onceDay.set(t.id, d);
  }
  tasks.forEach((t, i) => {
    if (t.frequency === "weekly") onceDay.set(t.id, (i % 5) + 2); // weekday offset within a week
  });

  for (let day = 1; day <= 30; day++) {
    const week = Math.min(Math.ceil(day / 7), 4);
    const dow = ((day - 1) % 7) + 1;
    const todays = tasks.filter((t) => {
      if (t.startWeek > week) return false;
      switch (t.frequency) {
        case "daily":
          return true;
        case "3x_week":
          return dow === 1 || dow === 3 || dow === 5;
        case "weekly":
          return dow === onceDay.get(t.id);
        case "once":
          return day === onceDay.get(t.id);
      }
    });
    // respect time budget (zero-minute habits always fit)
    let used = 0;
    const picked: string[] = [];
    const budget = Math.max(minutesPerDay, 10) * 1.25;
    for (const t of todays) {
      if (t.minutes === 0 || used + t.minutes <= budget || t.frequency === "once") {
        picked.push(t.id);
        used += t.minutes;
      }
    }
    days.push({ day, taskIds: picked });
  }
  return days;
}

export function buildDemoPlan(profile: Profile): Plan {
  const goals = new Set<string>(["core", ...profile.goals.flatMap((g) => GOAL_TO_LIB[g] ?? [])]);
  const minor = profile.age < 18;
  const lib = TASK_LIBRARY.filter((t) => t.goals.some((g) => goals.has(g)))
    .filter((t) => !(minor && t.key === "progressive"))
    .sort((a, b) => b.priority - a.priority);
  const tasks: PlanTask[] = lib.map(({ key, goals: _g, priority: _p, ...t }) => ({ ...t, id: `t_${key}` }));
  const goalNames = profile.goals.map((g) => GOAL_LABELS[g]).join(", ");
  return {
    createdAt: new Date().toISOString(),
    startDate: dateKey(),
    source: "demo",
    summary: `תוכנית הדרגתית של 30 יום שמתמקדת ב: ${goalNames || "יסודות"}. מתחילים בהרגלים קטנים וקלים, ומוסיפים בכל שבוע שכבה חדשה — כ-${profile.minutesPerDay} דקות ביום.`,
    weeks: WEEK_FOCUS.map((focus, i) => ({ week: i + 1, focus })),
    morningRoutine: DEFAULT_MORNING,
    eveningRoutine: DEFAULT_EVENING,
    tasks,
    days: schedule(tasks, profile.minutesPerDay),
  };
}

export function planFromAI(ai: PlanAI, profile: Profile): Plan {
  const tasks: PlanTask[] = ai.tasks.map((t) => ({
    ...t,
    id: uid("t"),
    minutes: Math.max(0, Math.round(t.minutes)),
    startWeek: Math.min(Math.max(Math.round(t.startWeek), 1), 4),
    frequency: t.frequency as Frequency,
    category: t.category as Category,
  }));
  return {
    createdAt: new Date().toISOString(),
    startDate: dateKey(),
    source: "ai",
    summary: ai.summary,
    weeks: ai.weeks.slice(0, 4),
    morningRoutine: ai.morningRoutine,
    eveningRoutine: ai.eveningRoutine,
    tasks,
    days: schedule(tasks, profile.minutesPerDay),
  };
}

export const GOAL_LABELS: Record<Goal, string> = {
  grooming: "טיפוח וסטייל פנים",
  haircut: "למצוא תספורת מתאימה",
  skin: "טיפוח עור",
  hairHealth: "בריאות ועיצוב שיער",
  muscle: "כושר ובניית שריר",
  posture: "יציבה",
  growth: "מעקב גדילה בריא",
  sleep: "שינה",
  nutrition: "תזונה",
  puffiness: "נפיחות פנים ובטן",
  style: "לבוש וסטייל אישי",
  confidence: "ביטחון והרגלים טובים",
};

/** 1-based plan day for a date, or null if outside the plan. */
export function planDay(plan: Plan | null, key: string = dateKey()) {
  if (!plan) return null;
  const d = daysBetween(plan.startDate, key) + 1;
  return d >= 1 && d <= 30 ? d : null;
}

export function tasksForDate(plan: Plan | null, key: string, custom: Record<string, PlanTask[]>): PlanTask[] {
  const result: PlanTask[] = [];
  const d = planDay(plan, key);
  if (plan && d) {
    const byId = new Map(plan.tasks.map((t) => [t.id, t]));
    for (const id of plan.days[d - 1]?.taskIds ?? []) {
      const t = byId.get(id);
      if (t) result.push(t);
    }
  }
  return [...result, ...(custom[key] ?? [])];
}

/* ---------- Gamification ---------- */

export const LEVELS = [
  { name: "מתחיל/ה", min: 0 },
  { name: "בדרך", min: 150 },
  { name: "עקבי/ת", min: 400 },
  { name: "זוהר/ת", min: 800 },
  { name: "Glow Pro", min: 1400 },
  { name: "Glow Master", min: 2200 },
  { name: "אגדה", min: 3500 },
];

export function levelFor(xp: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.min) idx = i;
  });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const progress = next ? (xp - cur.min) / (next.min - cur.min) : 1;
  return { level: idx + 1, name: cur.name, next: next?.min ?? null, progress, toNext: next ? next.min - xp : 0 };
}

export const XP = { task: 10, checkin: 15, workout: 25, analysis: 20, photo: 5 };

/** Simple, transparent importance heuristic for display (not a judgment of the user). */
export function importanceOf(t: PlanTask): "high" | "medium" | "low" {
  if (t.custom) return "medium";
  if (t.frequency === "daily" && (t.category === "skin" || t.category === "sleep")) return "high";
  if (t.frequency === "daily" || t.frequency === "once") return "medium";
  return "low";
}
