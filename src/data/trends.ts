import type { SourceKey } from "./sources";
import type { Category } from "@/lib/types";

/**
 * Trend check: glow-up advice from popular YouTube and TikTok videos, checked against reliable sources.
 *
 * How this was collected (Nov 2026): the videos themselves could not be watched or transcribed from the
 * build environment. "claim" is limited to what each video's own title, description or caption says, as
 * shown in search results. Nothing here is attributed to a video beyond that text. Each claim gets a verdict
 * and the safest way to do it, based on the app's verified sources where one exists.
 */

export type Platform = "youtube" | "tiktok";
export type Verdict = "works" | "partly" | "temporary" | "unproven" | "careful";
export type TrendKind = "habit" | "exercise" | "product" | "routine";

export interface TrendVideo {
  id: string;
  platform: Platform;
  title: string;
  creator?: string;
  url: string;
  /** What the video's own title / description / caption covers (paraphrased). */
  covers: string;
}

export interface TrendItem {
  id: string;
  title: string;
  kind: TrendKind;
  videos: string[];
  claim: string;
  verdict: Verdict;
  why: string;
  how: string[];
  minutes: number;
  products?: string[];
  warning?: string;
  source?: SourceKey;
  task?: { title: string; category: Category; minutes: number; how: string; frequency: "daily" | "3x_week" | "weekly" };
}

export const VERDICT: Record<Verdict, { label: string; tone: "green" | "accent" | "default" | "warn" | "danger" }> = {
  works: { label: "עובד", tone: "green" },
  partly: { label: "עובד חלקית", tone: "accent" },
  temporary: { label: "אפקט זמני", tone: "default" },
  unproven: { label: "לא מוכח", tone: "warn" },
  careful: { label: "בזהירות", tone: "danger" },
};

export const KIND_LABEL: Record<TrendKind, string> = { habit: "הרגל", exercise: "תרגיל", product: "מוצר", routine: "שגרה" };

export const VIDEOS: TrendVideo[] = [
  { id: "y-men", platform: "youtube", title: "The Complete Glow Up Guide For Men", url: "https://www.youtube.com/watch?v=LcYoACikolY", covers: "טיפוח, טיפוח עור, בושם וסטייל לגברים, והבסיס שגברים נוטים להזניח." },
  { id: "y-2026", platform: "youtube", title: "HOW TO GLOW UP IN 2026", url: "https://www.youtube.com/watch?v=zphtBh0SKno", covers: "12 הרגלים, ביניהם צעדים יומיים, אימוני כוח, יציבה, שמירה על מחסום העור, תזונה וריח אישי קבוע." },
  { id: "y-7days", platform: "youtube", title: "7 days GLOW UP Routine", url: "https://www.youtube.com/watch?v=Ts4vu3ed_lw", covers: "שגרה לשבוע עם פרקים על טיפוח עור, טיפוח שפתיים וטיפוח השיניים." },
  { id: "y-zero", platform: "youtube", title: "Glowup Secrets that actually work with $0 budget", url: "https://www.youtube.com/watch?v=_Hlm6kuFwmg", covers: "טיפים בחינם לעור, לשיער ולידיים. צופה הזהיר בתגובות שאלוורה עלולה לגרות את העור." },
  { id: "y-24h", platform: "youtube", title: "how to ACTUALLY glow up in 24 hours (mentally & physically)", url: "https://www.youtube.com/watch?v=9k9WbG4jIas", covers: "שגרת מקלחת מלאה, שיזוף עצמי, איפור ורווחה נפשית." },
  { id: "t-bloat", platform: "tiktok", title: "1 Week Glow Up Routine: How to Reduce Bloat & Look Fresh", creator: "@lauragalebe", url: "https://www.tiktok.com/@lauragalebe/video/7626897056833015053", covers: "שבוע לפני אירוע: להפחית סוכר, אלכוהול ומלח, להפחית אגירת נוזלים, הלבנת שיניים, וטיפוח עור מינימלי." },
  { id: "t-60s", platform: "tiktok", title: "Listing as many glow up tips as I can in 60 seconds", creator: "@izzyutterson", url: "https://www.tiktok.com/@izzyutterson/video/7282781132809145633", covers: "עור עם לחות, הפחתת נפיחות, שגרת טיפוח פשוטה, וחשיבות השינה." },
  { id: "t-guasha", platform: "tiktok", title: "Quick gua sha routine", creator: "@drlindseyschmidt", url: "https://www.tiktok.com/@drlindseyschmidt/video/7560805792346164510", covers: "ניקוי, כמה טיפות שמן לפנים, לצוואר ולחזה, תנועות גואשה קלות (לא גירוד), וסיום במים קרים. לבוקר נגד נפיחות או לאיפוס בערב." },
  { id: "t-faceex", platform: "tiktok", title: "My glow routine (30-day face exercise challenge)", creator: "@myglowroutine", url: "https://www.tiktok.com/@myglowroutine/video/7491120023017245974", covers: "תרגילי פנים לקו לסת, לאף, ל״עיני שועל״, לסנטר כפול ולקמטי חיוך." },
  { id: "t-belly", platform: "tiktok", title: "Gua sha massage for bloating", creator: "@bloombalance.co", url: "https://www.tiktok.com/@bloombalance.co/video/7249480103976013062", covers: "עיסוי בטן עדין עם שמן וגואשה בצורת U הפוכה לאורך המעי הגס, 10 חזרות, נגד נפיחות." },
];

export const TRENDS: TrendItem[] = [
  {
    id: "sleep",
    title: "שינה של 7-9 שעות",
    kind: "habit",
    videos: ["t-60s"],
    claim: "שינה היא אחד הטיפים הכי חשובים ל-glow up.",
    verdict: "works",
    why: "מבוגרים צריכים בדרך כלל 7 שעות ומעלה. שינה מספקת משפיעה על אנרגיה, מצב רוח וריכוז, ובפועל גם על איך שמרגישים ונראים בבוקר.",
    how: ["שעת שינה קבועה, גם בסופ״ש", "מסכים כבויים חצי שעה לפני השינה", "חדר חשוך וקריר"],
    minutes: 0,
    source: "cdcSleep",
    task: { title: "לישון 7+ שעות", category: "sleep", minutes: 0, how: "שעת שינה קבועה, בלי מסך חצי שעה לפני.", frequency: "daily" },
  },
  {
    id: "simple-skincare",
    title: "שגרת טיפוח פשוטה: ניקוי, לחות, SPF",
    kind: "routine",
    videos: ["t-60s", "t-bloat", "y-men", "y-7days"],
    claim: "שגרה פשוטה ועקבית, ולפני אירוע לא לנסות מוצרים חדשים.",
    verdict: "works",
    why: "ניקוי עדין, לחות והגנה מהשמש הם הבסיס שרופאי עור ממליצים עליו. לפני אירוע עדיף לא להכניס מוצר חדש, כדי לא להסתכן בגירוי.",
    how: ["בוקר: ניקוי עדין, לחות, SPF 30+", "ערב: ניקוי ולחות", "מוצר חדש: אחד בכל פעם, לא בשבוע של אירוע"],
    minutes: 4,
    products: ["תכשיר ניקוי עדין", "קרם לחות", "קרם הגנה SPF 30+"],
    source: "aadFaceWash",
    task: { title: "שגרת עור: ניקוי, לחות, SPF", category: "skin", minutes: 4, how: "בוקר עם SPF, ערב בלי.", frequency: "daily" },
  },
  {
    id: "barrier",
    title: "שמירה על מחסום העור",
    kind: "habit",
    videos: ["y-2026"],
    claim: "לשמור על מחסום העור כחלק מההרגלים.",
    verdict: "works",
    why: "עור יבש או מגורה נראה עייף. לחות קבועה, ניקוי עדין ופחות פילינג עוזרים לעור להחזיק לחות.",
    how: ["מים פושרים, לא חמים", "לחות מיד אחרי ניקוי ומקלחת", "פילינג לכל היותר 1-2 פעמים בשבוע", "לא לשלב כמה חומרים פעילים חזקים יחד"],
    minutes: 2,
    products: ["קרם לחות עם קרמידים או גליצרין"],
    source: "aadDry",
  },
  {
    id: "water",
    title: "לשתות מספיק מים",
    kind: "habit",
    videos: ["t-60s", "t-bloat"],
    claim: "עור עם לחות ושתייה כדי להיראות רענן.",
    verdict: "partly",
    why: "שתייה מספקת חשובה לבריאות, וצמא ממושך מורגש. אבל אין ראיות טובות שמים מעבר לצורך הרגיל ״מאירים״ את העור. גם לא צריך גלון ביום כמו שחלק מהסרטונים ממליצים.",
    how: ["לשתות לאורך היום, יותר בחום ובאימון", "שתן בהיר הוא סימן טוב", "מים ושתייה לא ממותקת עדיפים"],
    minutes: 0,
    source: "nhsWater",
  },
  {
    id: "bloat-week",
    title: "שבוע לפני אירוע: פחות מלח, אלכוהול וסוכר",
    kind: "habit",
    videos: ["t-bloat"],
    claim: "להפחית סוכר, אלכוהול ומלח כדי להפחית אגירת נוזלים ולהיראות רענן.",
    verdict: "partly",
    why: "פחות מלח ואלכוהול יכולים להפחית נפיחות זמנית אצל חלק מהאנשים, ואלכוהול פוגע גם בשינה. אבל זה לא ״ירידה במשקל״, ואין צורך בדיאטה קיצונית או בצמצום שתייה.",
    how: ["פחות מזון מעובד ומלוח בימים שלפני", "בלי אלכוהול בערב שלפני", "לשתות רגיל, לא פחות", "ארוחות רגילות. לא לדלג על ארוחות"],
    minutes: 0,
    warning: "נפיחות שחוזרת או שמגיעה עם כאב: לבדוק אצל רופא/ה.",
    source: "nhsBloating",
  },
  {
    id: "whitening",
    title: "הלבנת שיניים לפני אירוע",
    kind: "product",
    videos: ["t-bloat"],
    claim: "להלבין שיניים כחלק מההכנה לאירוע.",
    verdict: "partly",
    why: "מוצרי הלבנה מסירים בעיקר כתמים חיצוניים, למשל מקפה או מעישון. הם לא משנים את הצבע הטבעי של השן, ויכולים לגרום לרגישות. לפני הלבנה כדאי להתייעץ עם רופא/ת שיניים.",
    how: ["קודם בסיס: צחצוח פעמיים ביום וחוט דנטלי", "לשאול רופא/ת שיניים איזו שיטה מתאימה", "רגישות: להפסיק ולהתייעץ"],
    minutes: 0,
    products: ["משחה עם פלואוריד", "מוצר הלבנה לפי המלצת רופא/ת שיניים"],
    warning: "לא להשתמש בתכשירים ביתיים חומציים או שוחקים (לימון, סודה לשתייה בכמויות, פחם).",
    source: "nhsTeeth",
  },
  {
    id: "dental",
    title: "טיפוח שיניים יומיומי",
    kind: "routine",
    videos: ["y-7days"],
    claim: "טיפוח השיניים כחלק משגרת ה-glow up.",
    verdict: "works",
    why: "צחצוח פעמיים ביום עם פלואוריד וניקוי בין השיניים הם הבסיס לשיניים בריאות ולנשימה רעננה.",
    how: ["2 דקות, פעמיים ביום, משחה עם פלואוריד", "לירוק ולא לשטוף מיד", "חוט דנטלי או מברשת בין-שינית פעם ביום", "ניקוי לשון"],
    minutes: 4,
    products: ["משחה עם פלואוריד", "חוט דנטלי", "מגרד לשון"],
    source: "nhsTeeth",
    task: { title: "חוט דנטלי וניקוי לשון", category: "skin", minutes: 2, how: "פעם ביום, בערב.", frequency: "daily" },
  },
  {
    id: "lips",
    title: "טיפוח שפתיים",
    kind: "product",
    videos: ["y-7days"],
    claim: "פרק שלם על טיפוח שפתיים בשגרה השבועית.",
    verdict: "works",
    why: "שפתיים יבשות וסדוקות בולטות. שפתון לחות, ובחוץ שפתון עם SPF, הם הצעד הכי יעיל. פילינג לשפתיים הוא אופציונלי ועדיף עדין.",
    how: ["שפתון לחות בערב ולפי הצורך", "בחוץ ובשמש: שפתון עם SPF", "לא ללקק שפתיים יבשות", "פילינג עדין לכל היותר פעם בשבוע"],
    minutes: 1,
    products: ["שפתון לחות", "שפתון עם SPF"],
    task: { title: "שפתון לחות", category: "skin", minutes: 1, how: "בערב, ובחוץ עם SPF.", frequency: "daily" },
  },
  {
    id: "strength",
    title: "אימוני כוח",
    kind: "exercise",
    videos: ["y-2026"],
    claim: "אימוני כוח כחלק מההרגלים.",
    verdict: "works",
    why: "ההמלצה למבוגרים היא אימון כוח לכל קבוצות השריר לפחות פעמיים בשבוע. זה משפר כוח, יציבה וביטחון, ומשפיע על איך הבגדים יושבים.",
    how: [
      "אימון מתחילים לכל הגוף, פעמיים-שלוש בשבוע:",
      "סקוואט: 3 סטים של 8-12",
      "שכיבות סמיכה (או על הברכיים): 3 סטים של 6-12",
      "חתירה עם גומייה או משקולת: 3 סטים של 8-12",
      "גשר ישבן: 3 סטים של 10-15",
      "פלאנק: 3 פעמים 20-40 שניות",
      "להוסיף חזרות או משקל בהדרגה. כאב חד: לעצור",
    ],
    minutes: 30,
    source: "cdcActivityAdults",
    task: { title: "אימון כוח לכל הגוף", category: "fitness", minutes: 30, how: "סקוואט, שכיבות סמיכה, חתירה, גשר ישבן ופלאנק, 3 סטים כל אחד.", frequency: "3x_week" },
  },
  {
    id: "steps",
    title: "צעדים יומיים",
    kind: "habit",
    videos: ["y-2026"],
    claim: "לעשות צעדים כל יום.",
    verdict: "works",
    why: "ההמלצה היא לפחות 150 דקות בשבוע של פעילות בעצימות בינונית, כמו הליכה מהירה. הליכה יומית היא הדרך הכי קלה להגיע לזה.",
    how: ["30 דקות הליכה מהירה, 5 ימים בשבוע", "לחלק ל-3 הליכות של 10 דקות אם צריך", "אחרי ארוחה זה זמן טוב"],
    minutes: 30,
    source: "cdcActivity",
    task: { title: "הליכה מהירה", category: "fitness", minutes: 30, how: "קצב שקשה מעט לשיר בו.", frequency: "daily" },
  },
  {
    id: "posture",
    title: "יציבה",
    kind: "exercise",
    videos: ["y-2026"],
    claim: "לשפר יציבה כחלק מההרגלים.",
    verdict: "partly",
    why: "יציבה זקופה משפיעה מיד על איך שנראים בתמונות ובמראה. התרגילים עוזרים בעיקר להרגיש את התנוחה ולחזק את גב עליון. הם לא ״מתקנים״ מבנה עצם.",
    how: [
      "סנטר לאחור (chin tuck): 10 חזרות, החזקה של 3 שניות",
      "קירוב שכמות: 3 סטים של 10, החזקה של 3 שניות",
      "מלאכי קיר (wall angels): 2 סטים של 10 לאט",
      "מתיחת חזה בפתח דלת: 2 פעמים 30 שניות",
      "תזכורת: כל שעה לקום ולהתמתח",
    ],
    minutes: 8,
    warning: "כאב גב או צוואר מתמשך: לפנות לפיזיותרפיסט/ית או רופא/ה.",
    source: "nhsPosture",
    task: { title: "תרגילי יציבה", category: "posture", minutes: 8, how: "סנטר לאחור, קירוב שכמות, מלאכי קיר, מתיחת חזה.", frequency: "daily" },
  },
  {
    id: "scent",
    title: "ריח אישי קבוע",
    kind: "product",
    videos: ["y-2026", "y-men"],
    claim: "לבחור בושם ״חתימה״.",
    verdict: "partly",
    why: "זה עניין של העדפה, אבל ריח נקי ונעים הוא חלק מהרושם. מה שחשוב: מעט, ולא ריח שמתנגש עם הדאודורנט.",
    how: ["1-3 ריסוסים בלבד", "לבדוק על העור לפני קנייה", "להשתמש ביועץ הבשמים באפליקציה כדי למצוא כיוון"],
    minutes: 1,
    source: "aadContactDermatitis",
  },
  {
    id: "men-grooming",
    title: "בסיס הטיפוח לגברים",
    kind: "routine",
    videos: ["y-men"],
    claim: "הבסיס שגברים נוטים להזניח: טיפוח, טיפוח עור, בושם וסטייל.",
    verdict: "works",
    why: "הפרטים הקטנים עושים את רוב ההבדל: קו זקן נקי, ציפורניים, גבות, תספורת בזמן ובגדים במידה.",
    how: ["קו זקן וצוואר נקי כל כמה ימים", "ציפורניים פעם בשבוע", "תספורת כל 3-5 שבועות בשיער קצר", "בגדים במידה הנכונה"],
    minutes: 10,
    source: "aadShave",
  },
  {
    id: "shower",
    title: "שגרת מקלחת ״מלאה״",
    kind: "routine",
    videos: ["y-24h"],
    claim: "שגרת מקלחת מלאה כחלק מ-glow up של 24 שעות.",
    verdict: "partly",
    why: "פעם בשבוע שגרה ארוכה יותר נעימה ומועילה (פילינג גוף עדין, טיפוח שיער, גילוח). אבל מקלחות ארוכות וחמות כל יום מייבשות את העור.",
    how: ["מים פושרים ומקלחת קצרה ביום-יום", "פעם בשבוע: פילינג גוף עדין", "תחליב לחות מיד אחרי"],
    minutes: 20,
    products: ["תחליב גוף", "כפפת פילינג או פילינג עדין"],
    source: "aadDry",
  },
  {
    id: "self-tan",
    title: "שיזוף עצמי (self-tanner)",
    kind: "product",
    videos: ["y-24h"],
    claim: "שיזוף עצמי כחלק מההכנה.",
    verdict: "temporary",
    why: "זו העדפה קוסמטית שנמשכת כמה ימים. היתרון: אין חשיפה לשמש. מה שחשוב לדעת: שיזוף עצמי לא מגן מהשמש, אז עדיין צריך SPF.",
    how: ["פילינג עדין יום קודם", "בדיקה על אזור קטן קודם", "לחות על מרפקים וברכיים לפני", "לשטוף ידיים מיד", "SPF כרגיל"],
    minutes: 20,
    products: ["קרם או מוס שיזוף עצמי", "כפפת מריחה"],
    warning: "לא שיזוף בשמש או במיטת שיזוף כתחליף.",
    source: "aadTestProducts",
  },
  {
    id: "guasha",
    title: "גואשה ועיסוי פנים",
    kind: "product",
    videos: ["t-guasha"],
    claim: "גואשה עם שמן בתנועות קלות, וסיום במים קרים, נגד נפיחות בבוקר.",
    verdict: "temporary",
    why: "עיסוי עדין וקור יכולים להפחית נפיחות של בוקר לזמן קצר. אין ראיות שגואשה ״מפסלת״ לסת, שורפת שומן או משנה את מבנה הפנים.",
    how: ["על עור נקי עם מעט שמן או קרם", "תנועות קלות כלפי חוץ ולמטה, בלי ללחוץ חזק", "2-5 דקות", "סיום בכלי קר או מים קרים"],
    minutes: 5,
    products: ["כלי גואשה", "שמן פנים או קרם לחות"],
    warning: "לא על אקנה פעיל, פצעים או עור מגורה. לא ללחוץ עד אדמומיות או חבורות.",
    source: "mayoBags",
  },
  {
    id: "cold",
    title: "קור לפנים בבוקר (מים קרים או רולר קר)",
    kind: "product",
    videos: ["t-guasha"],
    claim: "סיום במים קרים או בכלי קר כדי להפחית נפיחות.",
    verdict: "temporary",
    why: "קור מצמצם נפיחות לזמן קצר. זה בטוח וזול, אבל האפקט נמשך שעות, לא ימים.",
    how: ["שטיפה במים קרים או כפית או רולר מהמקרר", "1-2 דקות", "לא קרח ישירות על העור"],
    minutes: 2,
    products: ["רולר פנים קר (אופציונלי)"],
    source: "mayoBags",
  },
  {
    id: "face-exercises",
    title: "תרגילי פנים ללסת, לאף ולסנטר כפול",
    kind: "exercise",
    videos: ["t-faceex"],
    claim: "אתגר 30 יום של תרגילי פנים לקו לסת, אף, ״עיני שועל״, סנטר כפול וקמטי חיוך.",
    verdict: "unproven",
    why: "אין ראיות טובות שתרגילי פנים משנים צורת אף, לסת או עיניים. האף עשוי סחוס ועצם ולא מגיב לתרגילים. יש מחקרים קטנים מאוד על ״יוגה לפנים״ ומלאות הלחיים, אבל לא מספיק כדי להבטיח תוצאה.",
    how: ["אם נהנים מזה: עיסוי פנים עדין במקום תרגילים אגרסיביים", "לסת: מה שבאמת משנה את מראה הקו הוא שיער פנים, תספורת, יציבת ראש ואחוז שומן כללי"],
    minutes: 0,
    warning: "לעיסה חזקה או לחיצת לסת ממושכת עלולות להעמיס על מפרק הלסת. כאב או נקישות: להפסיק.",
  },
  {
    id: "belly-massage",
    title: "עיסוי בטן עם גואשה נגד נפיחות",
    kind: "exercise",
    videos: ["t-belly"],
    claim: "עיסוי בטן עדין בצורת U הפוכה לאורך המעי הגס, 10 חזרות, נגד נפיחות.",
    verdict: "unproven",
    why: "עיסוי בטן עדין עשוי להקל על חלק מהאנשים עם עצירות, והוא בטוח כשהוא עדין. אין ראיות שגואשה עצמה מוסיפה משהו, ונפיחות חוזרת צריכה בדיקה ולא רק עיסוי.",
    how: ["בשכיבה, תנועות עדינות עם כף היד בכיוון השעון", "כמה דקות", "יחד עם תנועה, שתייה וסיבים"],
    minutes: 5,
    warning: "לא בהריון, ולא כשיש כאב בטן חד או חום. נפיחות מתמשכת או ירידה במשקל: לפנות לרופא/ה.",
    source: "nhsBloating",
  },
  {
    id: "aloe",
    title: "אלוורה וטיפים ביתיים לעור",
    kind: "product",
    videos: ["y-zero"],
    claim: "טיפים חינמיים לעור ולשיער. צופה הזהיר שאלוורה עלולה לגרות.",
    verdict: "careful",
    why: "״טבעי״ לא אומר מתאים לכל עור. אלוורה ותכשירים ביתיים יכולים לגרום לגירוי או לאלרגיה אצל חלק מהאנשים. לימון, סודה לשתייה ותבלינים על העור הם טיפים ביתיים שמזיקים לעור.",
    how: ["בדיקת מטלית על אזור קטן כמה ימים", "אדמומיות, גרד או צריבה: לשטוף ולהפסיק", "לא לשים על העור לימון, סודה לשתייה, קינמון או משחת שיניים"],
    minutes: 0,
    source: "aadTestProducts",
  },
  {
    id: "hands",
    title: "ידיים וציפורניים",
    kind: "routine",
    videos: ["y-zero"],
    claim: "טיפוח ידיים כחלק מ-glow up בתקציב אפס.",
    verdict: "works",
    why: "ידיים יבשות וציפורניים לא מסודרות בולטות יותר ממה שחושבים. זה זול ומהיר.",
    how: ["קרם ידיים אחרי שטיפה ובערב", "ציפורניים קצרות ונקיות, פעם בשבוע", "כפפות לכלים ולקור"],
    minutes: 3,
    products: ["קרם ידיים", "קוצץ ציפורניים", "פצירה"],
    source: "aadDry",
    task: { title: "קרם ידיים בערב", category: "skin", minutes: 1, how: "אחרי השטיפה האחרונה של היום.", frequency: "daily" },
  },
  {
    id: "consistency",
    title: "עקביות לפני מוצרים",
    kind: "habit",
    videos: ["y-zero", "t-60s"],
    claim: "טיפים שעובדים בלי כסף: הרגלים פשוטים כל יום.",
    verdict: "works",
    why: "רוב השינוי מגיע משינה, טיפוח בסיסי, תנועה והופעה מסודרת, כל יום. מוצרים יקרים לא מחליפים עקביות.",
    how: ["לבחור 3 הרגלים בלבד לשבועיים", "לסמן כל יום בדשבורד", "להוסיף הרגל רק כשהקודמים יציבים"],
    minutes: 0,
    source: "aadBudget",
  },
];
