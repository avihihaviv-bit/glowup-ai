/**
 * Structured tip library. Phase 1 seeds general grooming / style tips only (no health claims, so no source URL needed).
 * Health and science tips will be added with verified source URLs in Phase 4.
 */
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
  source?: string;
  suitability?: string;
  outing?: boolean;
}

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  evidence: "מבוסס מחקר",
  limited: "ראיות מוגבלות",
  temporary: "אפקט קוסמטי זמני",
  grooming: "עצת טיפוח כללית",
  preference: "העדפה אישית / סטייל",
};

export const TIPS: Tip[] = [
  { id: "M-001", title: "ציפורניים קצרות ונקיות", description: "גזירה ישרה אחת לשבוע וניקוי מתחת לציפורן. פרט קטן שבולט בלחיצת יד.", category: "grooming", subcategory: "ידיים", minutes: 5, difficulty: "easy", importance: "medium", when: "פעם בשבוע", products: ["גוזז ציפורניים"], evidence: "grooming" },
  { id: "M-002", title: "גבות: רק שערות בודדות", description: "מורידים שערות בודדות מתחת לקשת ובין הגבות, באור טוב. לא נוגעים בקו העליון.", category: "grooming", subcategory: "גבות", minutes: 5, difficulty: "easy", importance: "medium", when: "פעם בשבועיים", products: ["פינצטה"], warning: "לא למרוט יותר מדי בפעם אחת.", evidence: "grooming" },
  { id: "M-003", title: "קו צוואר נקי", description: "גילוח או קיצוץ של השערות מתחת לקו הלסת ובעורף בין תספורות.", category: "grooming", subcategory: "שיער פנים", minutes: 5, difficulty: "medium", importance: "low", when: "פעם בשבוע", products: ["מכונת קיצוץ"], evidence: "grooming" },
  { id: "M-004", title: "שערות אף ואוזניים", description: "קיצוץ עדין עם מכשיר ייעודי. לא למרוט.", category: "grooming", subcategory: "פרטים קטנים", minutes: 3, difficulty: "easy", importance: "low", when: "פעם בשבועיים", products: ["מכשיר קיצוץ לאף"], evidence: "grooming" },
  { id: "L-001", title: "תכננו לבוש ערב לפני", description: "בוחרים בגדים ונעליים בערב. חוסך זמן בבוקר ומונע החלטות בלחץ.", category: "style", subcategory: "תכנון", minutes: 3, difficulty: "easy", importance: "medium", when: "ערב", products: [], evidence: "preference" },
  { id: "L-002", title: "התאמת מידה לפני מותג", description: "חולצה שהתפר שלה יושב בקצה הכתף נראית טוב יותר מפריט יקר שגדול עליך.", category: "style", subcategory: "גזרה", minutes: 0, difficulty: "easy", importance: "high", when: "בקנייה", products: [], evidence: "preference" },
  { id: "L-003", title: "חגורה בגוון הנעליים", description: "חגורה ונעליים מאותה משפחת צבע מסדרות את המראה.", category: "style", subcategory: "אקססוריז", minutes: 0, difficulty: "easy", importance: "low", when: "בהתלבשות", products: [], evidence: "preference" },
  { id: "L-004", title: "עד שלושה צבעים בלבוש", description: "צבע חזק אחד וניטרלים סביבו נראה מודרני ובטוח.", category: "style", subcategory: "צבעים", minutes: 0, difficulty: "easy", importance: "medium", when: "בהתלבשות", products: [], evidence: "preference" },
  { id: "L-005", title: "נעליים נקיות", description: "ניגוב מהיר של הסוליה והצד לפני יציאה משדרג כל לבוש.", category: "style", subcategory: "נעליים", minutes: 2, difficulty: "easy", importance: "medium", when: "לפני יציאה", products: ["מגבון לח"], evidence: "grooming" },
  { id: "L-006", title: "גיהוץ או אדים לחולצה", description: "קמטים בולטים יותר מכל פריט. מכשיר אדים קטן עושה את העבודה בדקה.", category: "style", subcategory: "תחזוקת בגדים", minutes: 3, difficulty: "easy", importance: "medium", when: "לפני יציאה", products: ["מגהץ אדים"], evidence: "grooming" },
  { id: "H-001", title: "כמות מוצר בגודל אפונה", description: "מחממים בין כפות הידיים ומפזרים מאחור לפנים. מוסיפים רק אם צריך.", category: "hairStyling", subcategory: "מוצרים", minutes: 2, difficulty: "easy", importance: "medium", when: "בבוקר", products: ["משחה / קליי"], evidence: "grooming" },
  { id: "H-002", title: "תספורת לפני שהצורה נעלמת", description: "בשיער קצר, כל 3-5 שבועות שומר על צורה נקייה.", category: "hairStyling", subcategory: "תספורת", minutes: 0, difficulty: "easy", importance: "medium", when: "כל 3-5 שבועות", products: [], evidence: "grooming" },
  { id: "H-003", title: "צלמו את התספורת שאהבתם", description: "תמונה מלפנים ומהצד אחרי תספורת טובה מקלה לבקש אותה שוב.", category: "hairStyling", subcategory: "תספורת", minutes: 1, difficulty: "easy", importance: "low", when: "אחרי תספורת", products: [], evidence: "grooming" },
  { id: "P-001", title: "בדיקת מראה מהצד", description: "לפני יציאה בודקים שיער וצווארון גם מהצד ומאחור עם מראה שנייה או מצלמה.", category: "grooming", subcategory: "בדיקה אחרונה", minutes: 1, difficulty: "easy", importance: "medium", when: "לפני יציאה", products: [], evidence: "grooming" },
  { id: "P-002", title: "תמונות התקדמות באותם תנאים", description: "אותו חלון, אותה שעה, אותו מרחק. כך ההבדלים אמיתיים ולא של תאורה.", category: "photo", subcategory: "צילום", minutes: 2, difficulty: "easy", importance: "medium", when: "פעם בשבוע", products: [], evidence: "grooming" },
  { id: "P-003", title: "אור יום מול הפנים", description: "עומדים מול חלון, לא עם הגב אליו. אור רך מהצד הקדמי מראה את הפרטים נכון.", category: "photo", subcategory: "צילום", minutes: 0, difficulty: "easy", importance: "medium", when: "בצילום", products: [], evidence: "grooming" },
  { id: "P-004", title: "מצלמה בגובה העיניים", description: "צילום מלמטה או מלמעלה מעוות פרופורציות. מניחים את הטלפון בגובה העיניים.", category: "photo", subcategory: "צילום", minutes: 0, difficulty: "easy", importance: "medium", when: "בצילום", products: [], evidence: "grooming" },
  { id: "C-001", title: "מגבת אישית לפנים", description: "מגבת נפרדת לפנים, שלא משתפים עם אחרים.", category: "hygiene", subcategory: "מגבות", minutes: 0, difficulty: "easy", importance: "medium", when: "תמיד", products: ["מגבת"], evidence: "grooming" },
  { id: "C-002", title: "בגדים נקיים מהמכונה", description: "בגד שלבשתם יום שלם עובר כביסה לפני שלובשים שוב, במיוחד אחרי זיעה.", category: "hygiene", subcategory: "בגדים", minutes: 0, difficulty: "easy", importance: "high", when: "יומי", products: [], evidence: "grooming" },
  { id: "O-001", title: "ממחטות ומסרק קטן בתיק", description: "שתי פריטים קטנים שפותרים את רוב התקלות של ערב בחוץ.", category: "outing", subcategory: "ציוד", minutes: 1, difficulty: "easy", importance: "low", when: "לפני יציאה", products: ["ממחטות", "מסרק קטן"], evidence: "grooming", outing: true },
  { id: "O-002", title: "לא לנסות מוצר חדש לפני אירוע", description: "מוצר עור או שיער חדש בודקים כמה ימים קודם, לא בערב של האירוע.", category: "outing", subcategory: "הכנה", minutes: 0, difficulty: "easy", importance: "high", when: "לפני אירוע", products: [], evidence: "grooming", outing: true },
  { id: "O-003", title: "לבדוק את מזג האוויר לפני שבוחרים בגדים", description: "שכבה נוספת לערב קריר או בד נושם ליום חם.", category: "outing", subcategory: "לבוש", minutes: 1, difficulty: "easy", importance: "medium", when: "לפני יציאה", products: [], evidence: "grooming", outing: true },
];

/** Same tip for the whole day, rotating daily. */
export function tipOfTheDay(key: string): Tip {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TIPS[h % TIPS.length];
}
