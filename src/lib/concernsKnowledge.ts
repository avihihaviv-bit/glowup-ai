import type { ConcernCategory } from "./types";
import type { ConcernAnalysisAI } from "./schemas";

/**
 * Demo-mode guidance: general, category-level education. It is NOT an analysis of the user's concern,
 * and the UI labels it as such. Nothing here claims to have understood the specific description.
 */
type T = Omit<ConcernAnalysisAI, "understanding" | "supportiveNote">;

const common = (steps: T["steps"], tasks: T["dailyTasks"], extra: Partial<T> = {}): T => ({
  kind: "unclear",
  known: [],
  unknown: ["פרטים אישיים (מתי התחיל, מה ניסית, מה רואים בפועל). ניתוח אישי דורש AI מחובר או בדיקה מקצועית."],
  possibleExplanations: [],
  realisticOutlook: "שיפור הדרגתי ועקבי אפשרי ברוב הנושאים הכלליים. התוצאה משתנה בין אנשים ולא ניתן להבטיח אותה.",
  steps,
  products: [],
  videoQueries: [],
  dailyTasks: tasks,
  trackingMetrics: ["הערה קצרה כל 2-3 ימים", "תמונה באותה תאורה אחת לשבוע (אופציונלי)"],
  seeProfessional: { recommended: false, when: "אם יש כאב, החמרה, דימום, שינוי פתאומי או שאין שיפור אחרי 8-12 שבועות." },
  ...extra,
});

export const CATEGORY_GUIDE: Record<ConcernCategory, T> = {
  skin: common(
    [
      { title: "שגרה בסיסית", how: "ניקוי עדין, לחות ו-SPF בבוקר. ניקוי ולחות בערב.", minutes: 5 },
      { title: "מוצר חדש אחד בכל פעם", how: "להוסיף מוצר אחד ולחכות שבועיים לפני הבא.", minutes: 0 },
      { title: "לא לסחוט ולא לשפשף", how: "מגע מרבי מחמיר סימנים ומגביר סיכון לכתמים.", minutes: 0 },
    ],
    [{ title: "שגרת עור בוקר", how: "ניקוי, לחות, SPF", minutes: 3 }],
    {
      possibleExplanations: ["שמן ולכלוך שמצטברים", "יובש או גירוי ממוצרים", "שינויים הורמונליים בגיל ההתבגרות", "מתח ושינה"],
      products: [{ type: "ניקוי עדין, לחות ו-SPF", why: "בסיס שמספיק לרוב האנשים", budgetTip: "מותגי פארם בסיסיים מספיקים." }],
      videoQueries: ["שגרת טיפוח עור למתחילים", "skin care routine basics dermatologist"],
      seeProfessional: { recommended: true, when: "אקנה כואב או עמוק, פריחה מתמשכת, שינוי בשומה, או אם אין שיפור אחרי 8-12 שבועות: רופא/ת עור." },
    },
  ),
  hair: common(
    [
      { title: "חפיפה עדינה", how: "שמפו על הקרקפת בלבד, מרכך על הקצוות, מים לא חמים.", minutes: 5 },
      { title: "הגנה מחום", how: "להפחית פן וחום גבוה, ולייבש באוויר כשאפשר.", minutes: 0 },
      { title: "גזירת קצוות", how: "כל 6-10 שבועות לפי האורך.", minutes: 0 },
    ],
    [{ title: "בדיקת שגרת שיער", how: "לרשום מתי חופפים ובאילו מוצרים", minutes: 3 }],
    { videoQueries: ["שגרת שיער בסיסית", "hair care routine basics"], seeProfessional: { recommended: true, when: "נשירה מוגברת, אזורי קרחת, גירוד או קשקשים מתמשכים: רופא/ת עור." } },
  ),
  face: common(
    [
      { title: "טיפוח בסיסי", how: "שגרת עור פשוטה, גבות מסודרות וקו לחי נקי.", minutes: 5 },
      { title: "בדיקת תספורת", how: "לבחור שתי תספורות מהגלריה ולהראות לספר.", minutes: 10 },
    ],
    [{ title: "בחירת תספורת", how: "Haircut Gallery", minutes: 10 }],
  ),
  body: common(
    [{ title: "תנועה קבועה", how: "הליכה ו-2-3 אימוני כוח בשבוע.", minutes: 25 }],
    [{ title: "הליכה 20 דקות", how: "בקצב נוח", minutes: 20 }],
    { seeProfessional: { recommended: true, when: "כאב, פציעה או מצב רפואי: רופא/ה או פיזיותרפיסט/ית." } },
  ),
  posture: common(
    [
      { title: "שגרת יציבה", how: "Chin tucks ×10, Wall angels ×10, מתיחת חזה 2×30 שנ׳.", minutes: 5 },
      { title: "הפסקות מישיבה", how: "לקום ולהתיישר כל 45 דקות.", minutes: 1 },
    ],
    [{ title: "שגרת יציבה 5 דקות", how: "Chin tucks, Wall angels, מתיחת חזה", minutes: 5 }],
    { possibleExplanations: ["ישיבה ממושכת", "חולשת שרירי גב עליון", "הרגלי עמידה"], seeProfessional: { recommended: true, when: "כאב מתמשך, נימול, או עיוות בולט: פיזיותרפיסט/ית או רופא/ה." } },
  ),
  fitness: common(
    [
      { title: "אימוני כוח בסיסיים", how: "סקוואט, שכיבות סמיכה, חתירה, פלאנק, 2-3 פעמים בשבוע.", minutes: 25 },
      { title: "עומס הדרגתי", how: "להוסיף חזרה או מעט משקל כשהטכניקה טובה.", minutes: 0 },
    ],
    [{ title: "אימון כוח קצר", how: "3 סבבים של 4 תרגילים", minutes: 25 }],
  ),
  nutrition: common(
    [
      { title: "ירק וחלבון בכל ארוחה", how: "חצי צלחת ירקות ומקור חלבון.", minutes: 0 },
      { title: "שתיית מים", how: "6-8 כוסות ביום.", minutes: 0 },
    ],
    [{ title: "ירק בכל ארוחה", how: "להוסיף ירק אחד לכל ארוחה", minutes: 0 }],
    { seeProfessional: { recommended: true, when: "לצרכים מיוחדים, אלרגיות או שינויי משקל בלתי מוסברים: רופא/ה או דיאטנית קלינית." } },
  ),
  bloating: common(
    [
      { title: "יומן סימפטומים ואוכל", how: "לרשום מתי מופיעה נפיחות, מה אכלתם ואיך מרגישים.", minutes: 3 },
      { title: "קצב אכילה והידרציה", how: "לאכול לאט, לשתות מים לאורך היום.", minutes: 0 },
    ],
    [{ title: "רישום בקצרה", how: "מה אכלתי ואיך הרגשתי", minutes: 3 }],
    {
      possibleExplanations: ["אכילה מהירה", "משקאות מוגזים", "שינויים בסיבים", "מתח", "שינה"],
      seeProfessional: { recommended: true, when: "כאב חזק, דם בצואה, ירידה לא מוסברת במשקל, הקאות או סימפטומים מתמשכים: הערכה רפואית. לא מומלצים דטוקס או משלשלים." },
    },
  ),
  sleep: common(
    [
      { title: "שעות קבועות", how: "שעת שינה וקימה קבועות (±30 דק׳).", minutes: 0 },
      { title: "בלי מסכים 30 דקות", how: "טלפון נטען מחוץ למיטה.", minutes: 0 },
    ],
    [{ title: "הכנה לשינה", how: "אור עמום, בלי מסכים", minutes: 30 }],
    { seeProfessional: { recommended: true, when: "נחירות חזקות, עצירות נשימה או נדודי שינה מתמשכים: רופא/ה." } },
  ),
  growth: common(
    [
      { title: "מדידה עקבית", how: "למדוד בלי נעליים, אותו שעה ביום, אותו מקום, כל 3-6 חודשים.", minutes: 5 },
      { title: "שינה ותזונה מגוונת", how: "שינה מספקת ותזונה מאוזנת תומכות בהתפתחות בריאה.", minutes: 0 },
    ],
    [{ title: "שינה מספקת", how: "8-10 שעות לבני נוער", minutes: 0 }],
    { realisticOutlook: "אי אפשר לחזות גובה סופי או להבטיח גדילה. מתיחות, תלייה ותוספים לא מאריכים עצמות.", seeProfessional: { recommended: true, when: "אם הגדילה נראית איטית מאוד או חריגה: רופא/ת ילדים או אנדוקרינולוג/ית." } },
  ),
  style: common(
    [
      { title: "התאמת מידה", how: "מידה נכונה חשובה יותר ממותג.", minutes: 0 },
      { title: "3 צבעים", how: "לבוש עם עד 3 צבעים, רובם ניטרליים.", minutes: 0 },
    ],
    [{ title: "תכנון לבוש למחר", how: "לבחור לבוש ונעליים", minutes: 3 }],
  ),
  other: common([{ title: "פירוק לצעדים קטנים", how: "לכתוב מה בדיוק רוצים לשנות ולבחור צעד אחד.", minutes: 5 }], [{ title: "צעד קטן אחד", how: "בחרו פעולה אחת להיום", minutes: 5 }]),
};
