import type { SourceKey } from "./sources";

/**
 * Product & fragrance advisor knowledge base.
 * Fragrance "examples" are long-established, widely sold fragrances whose main
 * character is well documented. They are suggestions to test on skin, never
 * sponsored, and no prices are shown. Everything else is product *types* and
 * label attributes, so nothing here pretends to know a specific formula.
 */

export type AdvisorCat = "fragrance" | "deodorant" | "skin" | "hair" | "body" | "oral";

export interface PrefOption {
  id: string;
  label: string;
  /** What to look for on the label / notes list */
  lookFor: string[];
  why: string;
  caution?: string;
  /** Words that identify this option in a user's own notes / family / ingredients */
  keywords?: string[];
  /** Ingredient-list test for products the user already scanned */
  ingredientTest?: { has?: string[]; lacks?: string[] };
  /** Product type to suggest */
  productType?: string;
  examples?: string[];
  seasons?: Season[];
  occasions?: Occasion[];
}

export type Season = "spring" | "summer" | "autumn" | "winter";
export type Occasion = "daily" | "work" | "evening" | "date" | "event" | "sport";
export type Intensity = "soft" | "medium" | "bold";
export type Budget = "low" | "mid" | "any";

export const SEASON_LABEL: Record<Season, string> = { spring: "אביב", summer: "קיץ", autumn: "סתיו", winter: "חורף" };
export const OCCASION_LABEL: Record<Occasion, string> = { daily: "יומיומי", work: "עבודה / לימודים", evening: "ערב", date: "דייט", event: "אירוע", sport: "ספורט" };
export const INTENSITY_LABEL: Record<Intensity, string> = { soft: "עדין", medium: "בינוני", bold: "בולט" };
export const BUDGET_LABEL: Record<Budget, string> = { low: "חסכוני", mid: "בינוני", any: "לא משנה" };

export interface CategoryDef {
  id: AdvisorCat;
  title: string;
  subtitle: string;
  lovePlaceholder: string;
  options: PrefOption[];
  hasIntensity?: boolean;
  hasOccasion?: boolean;
  hasSeason?: boolean;
  general: string[];
  testing: string[];
  sources: SourceKey[];
}

const FRAGRANCE: PrefOption[] = [
  {
    id: "sweet",
    label: "מתוק / גורמנד",
    lookFor: ["וניל", "טונקה", "קרמל / פרלין", "קקאו או קפה", "דבש"],
    why: "תווים מתוקים מרגישים חמים ועוטפים, ונשארים על העור זמן רב יחסית.",
    caution: "מתוק חזק עלול להיות כבד בחום ובחללים סגורים. בקיץ: פחות ריסוסים.",
    keywords: ["מתוק", "וניל", "גורמנד", "קרמל", "טונקה", "קפה", "קקאו", "פרלין", "דבש", "sweet", "vanilla", "gourmand", "tonka", "caramel", "praline", "coffee", "honey"],
    examples: ["Jean Paul Gaultier Le Male (לבנדר עם וניל)", "Valentino Uomo Born in Roma (וניל ועצים)", "Lancôme La Vie Est Belle (פרלין ואיריס)", "YSL Black Opium (קפה ווניל)", "Mugler Angel (פצ׳ולי וקרמל)"],
    seasons: ["autumn", "winter"],
    occasions: ["evening", "date", "event"],
  },
  {
    id: "fresh",
    label: "רענן",
    lookFor: ["ברגמוט", "מנטה", "לבנדר", "אמברוקסן", "תווים ימיים"],
    why: "רענן נעים לרוב האנשים, מתאים לחום ולעבודה, ונחשב בחירה בטוחה.",
    caution: "רעננים קלים נוטים להחזיק פחות זמן. אפשר לקחת בקבוקון קטן לריענון.",
    keywords: ["רענן", "ברגמוט", "מנטה", "fresh", "bergamot", "mint", "ambroxan", "אמברוקסן"],
    examples: ["Dior Sauvage (ברגמוט ואמברוקסן)", "Bleu de Chanel (הדרים ועצים)", "Giorgio Armani Acqua di Giò (ימי והדרים)"],
    seasons: ["spring", "summer"],
    occasions: ["daily", "work", "sport"],
  },
  {
    id: "citrus",
    label: "הדרים",
    lookFor: ["לימון", "ברגמוט", "אשכולית", "נרולי", "פטיטגריין"],
    why: "הדרים נותנים תחושה נקייה ושמחה, מתאים לבוקר ולקיץ.",
    caution: "הדרים מתאדים מהר. ברגמוט טבעי על עור חשוף לשמש עלול לגרות. עדיף לרסס על בגדים או באזורים מכוסים.",
    keywords: ["הדרים", "לימון", "ברגמוט", "אשכולית", "נרולי", "תפוז", "citrus", "lemon", "bergamot", "grapefruit", "neroli", "orange"],
    examples: ["Acqua di Parma Colonia (הדרים קלאסי)", "Dolce & Gabbana Light Blue (לימון ותפוח)", "Hermès Terre d'Hermès (תפוז ווטיבר)"],
    seasons: ["spring", "summer"],
    occasions: ["daily", "work"],
  },
  {
    id: "aquatic",
    label: "ימי / אקווטי",
    lookFor: ["תווים ימיים (calone)", "מלח ים", "אוזון"],
    why: "ריח של ים ואוויר נקי. מאוד מתאים לקיץ ולחום.",
    keywords: ["ימי", "אקווטי", "ים", "מלח", "aquatic", "marine", "sea", "ocean", "calone"],
    examples: ["Giorgio Armani Acqua di Giò", "Davidoff Cool Water (ימי קלאסי)"],
    seasons: ["summer"],
    occasions: ["daily", "sport"],
  },
  {
    id: "woody",
    label: "עצי",
    lookFor: ["ארז", "אלגום (סנדלווד)", "וטיבר", "עוד", "פצ׳ולי"],
    why: "עצים נותנים בסיס יציב ובוגר, עובדים כמעט בכל עונה.",
    keywords: ["עצי", "עץ", "ארז", "סנדל", "אלגום", "וטיבר", "עוד", "פצ׳ולי", "woody", "wood", "cedar", "sandalwood", "vetiver", "oud", "patchouli"],
    examples: ["Hermès Terre d'Hermès", "Le Labo Santal 33 (אלגום)", "Tom Ford Oud Wood"],
    seasons: ["autumn", "winter", "spring"],
    occasions: ["work", "evening", "event"],
  },
  {
    id: "aromatic",
    label: "ארומטי / עשבי",
    lookFor: ["לבנדר", "רוזמרין", "מרווה", "גרניום"],
    why: "המשפחה הקלאסית של ״ריח של אחרי גילוח״: נקי, מסודר ומוכר.",
    keywords: ["ארומטי", "עשבי", "לבנדר", "רוזמרין", "מרווה", "aromatic", "lavender", "rosemary", "sage", "fougere", "fougère"],
    examples: ["Azzaro Pour Homme (פוז׳ר קלאסי)", "Jean Paul Gaultier Le Male"],
    seasons: ["spring", "autumn"],
    occasions: ["daily", "work"],
  },
  {
    id: "floral",
    label: "פרחוני",
    lookFor: ["ורד", "יסמין", "פריחת תפוז", "איריס", "טוברוז"],
    why: "פרחים נותנים ריח רך או דרמטי, תלוי בפרח ובריכוז.",
    keywords: ["פרחוני", "פרח", "ורד", "יסמין", "איריס", "טוברוז", "floral", "rose", "jasmine", "iris", "tuberose", "orange blossom"],
    examples: ["Chanel Chance", "Gucci Bloom (יסמין וטוברוז)", "Chloé Eau de Parfum (ורד)"],
    seasons: ["spring", "summer"],
    occasions: ["daily", "date", "event"],
  },
  {
    id: "spicy",
    label: "תבליני / חם",
    lookFor: ["הל", "פלפל", "קינמון", "זעפרן", "ציפורן"],
    why: "תבלינים מוסיפים חום ועניין, יפה בערב ובחורף.",
    caution: "תבלינים חזקים יכולים להיות דומיננטיים. ריסוס אחד או שניים.",
    keywords: ["תבליני", "תבלין", "הל", "פלפל", "קינמון", "זעפרן", "spicy", "spice", "cardamom", "pepper", "cinnamon", "saffron"],
    examples: ["Viktor & Rolf Spicebomb (פלפל וקינמון)", "YSL La Nuit de L'Homme (הל)"],
    seasons: ["autumn", "winter"],
    occasions: ["evening", "date"],
  },
  {
    id: "amber",
    label: "ענברי / שרפי",
    lookFor: ["ענבר", "לבדנום", "בנזואין", "שרפים", "קטורת"],
    why: "ריח עשיר, עמוק ומתקתק-חם שמחזיק זמן רב.",
    keywords: ["ענבר", "שרף", "קטורת", "amber", "labdanum", "benzoin", "resin", "incense", "oriental"],
    examples: ["Guerlain Shalimar (ענבר ווניל)"],
    seasons: ["winter", "autumn"],
    occasions: ["evening", "event"],
  },
  {
    id: "musky",
    label: "נקי / מאסקי",
    lookFor: ["מאסק לבן", "אלדהידים", "תווי ״כביסה נקייה״"],
    why: "ריח של ״עור נקי״, קרוב לגוף ומאוד מתאים לעבודה.",
    keywords: ["מאסק", "נקי", "כביסה", "musk", "clean", "aldehyde", "skin"],
    examples: ["Narciso Rodriguez For Her (מאסק)"],
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["daily", "work"],
  },
  {
    id: "powdery",
    label: "פודרי",
    lookFor: ["איריס", "סיגלית", "הליוטרופ"],
    why: "רך, אלגנטי ומעט ״קוסמטי״.",
    keywords: ["פודרי", "איריס", "סיגלית", "powdery", "iris", "violet", "heliotrope"],
    examples: ["Dior Homme (איריס)"],
    seasons: ["autumn", "spring"],
    occasions: ["work", "event"],
  },
  {
    id: "leather",
    label: "עור / עשן / טבק",
    lookFor: ["עור", "טבק", "עשן ליבנה", "קטורת"],
    why: "ריח עמוק עם אופי חזק, בעיקר לערב ולחורף.",
    caution: "דומיננטי. לא לחללים קטנים ולא לחום.",
    keywords: ["עור", "טבק", "עשן", "leather", "tobacco", "smoke", "birch"],
    examples: ["Tom Ford Tobacco Vanille (טבק ווניל)"],
    seasons: ["winter"],
    occasions: ["evening"],
  },
  {
    id: "fruity",
    label: "פירותי",
    lookFor: ["תפוח", "אגס", "אפרסק", "דומדמניות", "אננס"],
    why: "שמח וצעיר, בדרך כלל קל ללבוש.",
    keywords: ["פירותי", "פרי", "תפוח", "אגס", "אפרסק", "אננס", "fruity", "fruit", "apple", "pear", "peach", "pineapple", "blackcurrant"],
    examples: ["Creed Aventus (אננס וליבנה)", "DKNY Be Delicious (תפוח)"],
    seasons: ["spring", "summer"],
    occasions: ["daily", "date"],
  },
  {
    id: "green",
    label: "ירוק",
    lookFor: ["עלי תאנה", "גלבנום", "דשא קצוץ", "תה ירוק"],
    why: "ריח טבעי של צמחייה, רענן אבל לא ״ספורטיבי״.",
    keywords: ["ירוק", "תאנה", "דשא", "תה", "green", "fig", "grass", "tea", "galbanum"],
    examples: ["Diptyque Philosykos (תאנה)"],
    seasons: ["spring", "summer"],
    occasions: ["daily", "work"],
  },
];

/** Combinations that people often ask for, with a specific direction. */
export const FRAGRANCE_COMBOS: { ids: [string, string]; text: string }[] = [
  { ids: ["sweet", "fresh"], text: "מתוק + רענן: חפשו ״פוז׳ר מתוק״ (לבנדר עם וניל או טונקה) או הדרים עם בסיס וניל. מתוק, אבל לא כבד." },
  { ids: ["sweet", "woody"], text: "מתוק + עצי: וניל או טונקה על בסיס אלגום או ארז. חם ונקי, מצוין לערב." },
  { ids: ["sweet", "spicy"], text: "מתוק + תבליני: וניל עם הל או קינמון. מושלם לחורף ולערבים." },
  { ids: ["fresh", "woody"], text: "רענן + עצי: ברגמוט או אשכולית על וטיבר או ארז. ״הריח הבטוח״ לעבודה וליומיום." },
  { ids: ["citrus", "woody"], text: "הדרים + עצי: תפוז או לימון על וטיבר. רענן שמחזיק יותר מהדרים לבד." },
  { ids: ["fresh", "musky"], text: "רענן + נקי: ריח של ״אחרי מקלחת״. הכי בטוח למשרד ולחללים סגורים." },
  { ids: ["floral", "sweet"], text: "פרחוני + מתוק: פריחת תפוז או יסמין עם וניל. רך ונעים לדייט." },
  { ids: ["fruity", "fresh"], text: "פירותי + רענן: תפוח או אגס עם הדרים. קליל ושמח לקיץ." },
];

const DEODORANT: PrefOption[] = [
  { id: "unscented", label: "בלי ריח", lookFor: ["fragrance-free / unscented", "ללא בישום"], why: "לא מתנגש עם הבושם, ומתאים לעור רגיש.", keywords: ["ללא ריח", "unscented", "fragrance free"], ingredientTest: { lacks: ["parfum", "fragrance"] }, productType: "דאודורנט ללא בישום" },
  { id: "fresh", label: "ריח רענן", lookFor: ["ריח הדרים / ימי / ״fresh״"], why: "רענן משתלב עם רוב הבשמים.", productType: "דאודורנט בניחוח רענן" },
  { id: "sweet", label: "ריח מתוק", lookFor: ["וניל, ענבר, ״warm״"], why: "חם ונעים, אבל עדיף שלא יתנגש עם בושם אחר.", caution: "אם שמים גם בושם, עדיף ריח עדין או אותה משפחת ריח.", productType: "דאודורנט בניחוח חם" },
  { id: "strong", label: "נגד הזעה חזק", lookFor: ["antiperspirant (מכיל מלחי אלומיניום)", "״clinical״ / ״48h״"], why: "דאודורנט רק מסתיר ריח. antiperspirant מפחית הזעה.", caution: "הכי יעיל כשמורחים בערב על עור יבש. הזעה מוגזמת מתמשכת: רופא/ה.", ingredientTest: { has: ["aluminum", "aluminium"] }, productType: "Antiperspirant" },
  { id: "noAlu", label: "בלי אלומיניום", lookFor: ["aluminum-free", "״deodorant״ ולא ״antiperspirant״"], why: "מטפל בריח בלבד, בלי להפחית הזעה.", ingredientTest: { lacks: ["aluminum", "aluminium"] }, productType: "דאודורנט ללא אלומיניום" },
  { id: "sensitive", label: "עור רגיש", lookFor: ["ללא בישום", "ללא אלכוהול", "״sensitive״"], why: "בישום ואלכוהול הם גורמי גירוי נפוצים.", ingredientTest: { lacks: ["alcohol denat", "parfum", "fragrance"] }, productType: "דאודורנט לעור רגיש" },
  { id: "noStains", label: "לא משאיר כתמים", lookFor: ["״invisible״ / ״no white marks״", "סטיק שקוף או ג׳ל"], why: "מונע כתמים לבנים על בגדים כהים.", productType: "סטיק שקוף / invisible" },
];

const SKIN: PrefOption[] = [
  { id: "light", label: "מרקם קליל / ג׳ל", lookFor: ["gel / gel-cream", "oil-free", "non-comedogenic"], why: "נספג מהר ולא מרגיש כבד.", productType: "קרם לחות ג׳ל", ingredientTest: {} },
  { id: "rich", label: "מרקם עשיר", lookFor: ["cream / balm", "ceramides", "shea butter", "petrolatum"], why: "עוזר לעור יבש להחזיק לחות.", productType: "קרם לחות עשיר" },
  { id: "noFragrance", label: "בלי בישום", lookFor: ["fragrance-free", "בלי parfum ברשימה"], why: "בישום הוא אחד הגורמים הנפוצים לגירוי בעור.", ingredientTest: { lacks: ["parfum", "fragrance"] }, productType: "מוצרים ללא בישום" },
  { id: "matte", label: "גימור מט", lookFor: ["matte / mattifying", "oil-free", "niacinamide"], why: "פחות ברק במהלך היום.", productType: "לחות או SPF בגימור מט" },
  { id: "glow", label: "גימור זוהר", lookFor: ["glycerin", "hyaluronic acid", "squalane"], why: "עור מלא לחות נראה רענן יותר.", productType: "סרום לחות" },
  { id: "oily", label: "לעור שמנוני", lookFor: ["non-comedogenic", "gel cleanser", "salicylic acid (BHA) בהדרגה"], why: "מוצרים קלים שלא סותמים נקבוביות.", ingredientTest: { has: ["salicylic"] }, productType: "תכשיר ניקוי ג׳ל" },
  { id: "dry", label: "לעור יבש", lookFor: ["ceramides", "glycerin", "ניקוי קרמי עדין"], why: "שומר על מחסום העור.", ingredientTest: { has: ["ceramide", "glycerin"] }, productType: "ניקוי קרמי + לחות עשירה" },
  { id: "sensitive", label: "לעור רגיש", lookFor: ["fragrance-free", "מעט רכיבים", "״for sensitive skin״"], why: "פחות רכיבים, פחות סיכוי לגירוי.", ingredientTest: { lacks: ["parfum", "fragrance", "alcohol denat"] }, productType: "שגרה בסיסית לעור רגיש" },
  { id: "spfNoCast", label: "SPF בלי שאריות לבנות", lookFor: ["SPF 30+ broad spectrum", "fluid / gel", "״no white cast״ או tinted"], why: "קל יותר להשתמש כל יום.", ingredientTest: {}, productType: "SPF 30+ פלואיד" },
  { id: "simple", label: "כמה שפחות מוצרים", lookFor: ["ניקוי עדין", "לחות עם SPF ביום"], why: "שגרה קצרה שבאמת מתמידים בה עדיפה על שגרה ארוכה.", productType: "שגרת 2-3 מוצרים" },
];

const HAIR: PrefOption[] = [
  { id: "strongHold", label: "אחיזה חזקה", lookFor: ["strong hold", "clay / fiber / ג׳ל"], why: "מחזיק צורה כל היום.", productType: "קליי או פייבר" },
  { id: "naturalHold", label: "אחיזה טבעית", lookFor: ["light / medium hold", "cream / paste", "sea salt spray"], why: "נראה כאילו אין מוצר בשיער.", productType: "קרם עיצוב או ספריי מלח ים" },
  { id: "matte", label: "גימור מט", lookFor: ["matte / natural finish", "clay / paste"], why: "בלי ברק, מראה טבעי ונפחי.", productType: "קליי מט" },
  { id: "shine", label: "ברק", lookFor: ["pomade", "high shine"], why: "מראה מסודר וחלק.", productType: "פומייד" },
  { id: "volume", label: "נפח", lookFor: ["volumizing", "sea salt spray", "פודרה לשורשים"], why: "מרים מהשורש בלי להכביד.", productType: "ספריי מלח ים / פודרת נפח" },
  { id: "antiFrizz", label: "נגד פריז", lookFor: ["leave-in conditioner", "anti-frizz cream", "שמן קל לקצוות"], why: "לחות מפחיתה פריז.", productType: "Leave-in / קרם נגד פריז" },
  { id: "curls", label: "לתלתלים", lookFor: ["curl cream", "leave-in", "שמפו עדין"], why: "שומר על הגדרת התלתל.", productType: "קרם תלתלים + leave-in" },
  { id: "lightScent", label: "ריח עדין", lookFor: ["light / fresh scent", "fragrance-free"], why: "לא מתחרה בבושם.", ingredientTest: { lacks: ["parfum", "fragrance"] }, productType: "מוצר עם ריח עדין" },
  { id: "washable", label: "נשטף בקלות", lookFor: ["water-based", "״washes out easily״"], why: "מוצרים על בסיס מים נשטפים בלי שאריות.", productType: "מוצר על בסיס מים" },
];

const BODY: PrefOption[] = [
  { id: "sweet", label: "ריח מתוק", lookFor: ["וניל, קוקוס, ״warm״"], why: "נעים ועוטף.", caution: "אם שמים בושם, עדיף שיהיה באותה משפחת ריח או בלי ריח בכלל.", productType: "סבון / תחליב בניחוח מתוק" },
  { id: "fresh", label: "ריח רענן", lookFor: ["הדרים, ימי, מנטה"], why: "תחושת ניקיון אחרי מקלחת.", productType: "סבון בניחוח רענן" },
  { id: "unscented", label: "בלי ריח", lookFor: ["fragrance-free"], why: "מתאים לעור רגיש ולא מתנגש עם בושם.", ingredientTest: { lacks: ["parfum", "fragrance"] }, productType: "סבון ללא בישום" },
  { id: "moisture", label: "לחות חזקה", lookFor: ["glycerin", "shea butter", "ceramides", "תחליב מיד אחרי מקלחת"], why: "עור יבש מרגיש ונראה טוב יותר עם לחות.", ingredientTest: { has: ["glycerin", "shea", "ceramide"] }, productType: "תחליב גוף עשיר" },
  { id: "sensitive", label: "עור רגיש", lookFor: ["syndet / ״soap-free״", "ללא בישום"], why: "פחות מייבש מסבון רגיל.", productType: "תחליב רחצה עדין" },
  { id: "quick", label: "מקלחת מהירה", lookFor: ["2-in-1 לגוף ולשיער", "תחליב רחצה"], why: "פחות מוצרים, אותה תוצאה.", productType: "2-in-1" },
];

const ORAL: PrefOption[] = [
  { id: "mildMint", label: "מנטה עדין", lookFor: ["mild mint", "פלואוריד 1350-1500 ppm"], why: "רענן בלי לשרוף.", ingredientTest: { has: ["fluoride"] }, productType: "משחה עם פלואוריד, מנטה עדין" },
  { id: "strongMint", label: "מנטה חזק", lookFor: ["extra fresh / strong mint", "פלואוריד"], why: "תחושת רעננות חזקה.", productType: "משחה עם פלואוריד, מנטה חזק" },
  { id: "noMint", label: "בלי מנטה", lookFor: ["mint-free / טעם אחר", "פלואוריד"], why: "טעם הוא עניין אישי, ומה שחשוב הוא הפלואוריד.", productType: "משחה ללא מנטה עם פלואוריד" },
  { id: "sensitive", label: "רגישות בשיניים", lookFor: ["sensitive", "potassium nitrate או stannous fluoride"], why: "רכיבים אלה מיועדים להפחתת רגישות לאורך זמן.", caution: "רגישות מתמשכת או כאב: לבדוק אצל רופא/ת שיניים.", ingredientTest: { has: ["potassium nitrate", "stannous"] }, productType: "משחה לשיניים רגישות" },
  { id: "whitening", label: "הלבנה", lookFor: ["whitening", "פלואוריד"], why: "משחות הלבנה מסירות בעיקר כתמים חיצוניים.", caution: "לא משנות את הצבע הטבעי של השן. הלבנה אמיתית נעשית אצל רופא/ת שיניים.", productType: "משחת הלבנה עם פלואוריד" },
  { id: "breath", label: "נשימה רעננה", lookFor: ["מגרד לשון", "חוט דנטלי", "מי פה ללא אלכוהול"], why: "רוב ריח הפה מגיע מהלשון ומבין השיניים.", productType: "מגרד לשון + חוט דנטלי" },
];

export const CATEGORIES: CategoryDef[] = [
  {
    id: "fragrance",
    title: "בושם",
    subtitle: "מתוק, רענן, עצי ועוד",
    lovePlaceholder: "למשל: אני אוהב ריח של וניל וקפה, משהו מתוק אבל לא כבד, שמחזיק כל היום",
    options: FRAGRANCE,
    hasIntensity: true,
    hasOccasion: true,
    hasSeason: true,
    general: [
      "בודקים על העור ולא רק על פס נייר. הריח משתנה אחרי 30-60 דקות.",
      "לא יותר מ-2-3 בשמים בכל ביקור בחנות. האף מתעייף.",
      "לפני בקבוק מלא: דוגמית או בקבוקון קטן לכמה ימים.",
      "1-3 ריסוסים מספיקים. על הצוואר, החזה או הבגדים, ובלי לשפשף.",
      "שומרים את הבקבוק הרחק מחום ומאור, לא בחדר הרחצה.",
      "EDC ו-EDT קלים יותר. EDP ו-Parfum מרוכזים יותר ובדרך כלל מחזיקים זמן רב יותר.",
      "השיווק לפי מגדר לא מחייב. בוחרים לפי מה שאוהבים.",
    ],
    testing: ["לרסס על פרק היד, לחכות 10 דקות ולהריח", "לחזור לריח אחרי שעה ואחרי 4 שעות", "אם יש אדמומיות או גרד: לשטוף ולא להשתמש"],
    sources: ["aadContactDermatitis", "aadTestProducts"],
  },
  {
    id: "deodorant",
    title: "דאודורנט",
    subtitle: "ריח, הזעה, עור רגיש",
    lovePlaceholder: "למשל: מזיע הרבה בקיץ, רוצה משהו שלא משאיר כתמים ולא מתנגש עם הבושם",
    options: DEODORANT,
    hasIntensity: false,
    general: [
      "Antiperspirant מפחית הזעה, ודאודורנט מטפל בריח. אפשר לבחור לפי הצורך.",
      "מורחים על עור נקי ויבש לגמרי. Antiperspirant עובד הכי טוב בערב.",
      "דאודורנט ללא ריח לא מתנגש עם הבושם.",
      "הזעה מוגזמת שמפריעה ליומיום: שווה לבדוק אצל רופא/ה.",
    ],
    testing: ["לנסות שבוע לפני שמחליטים", "לבדוק גירוי בבית השחי, במיוחד אחרי גילוח"],
    sources: ["nhsBodyOdour", "nhsSweating"],
  },
  {
    id: "skin",
    title: "טיפוח עור",
    subtitle: "לחות, ניקוי, SPF",
    lovePlaceholder: "למשל: אוהב קרם שנספג מהר, בלי ריח, ושהעור לא יבריק באמצע היום",
    options: SKIN,
    general: [
      "בסיס: ניקוי עדין, לחות, ו-SPF 30+ בבוקר. זה מספיק לרוב האנשים.",
      "מכניסים מוצר חדש אחד בכל פעם, כדי לדעת מה עובד ומה מגרה.",
      "״Non-comedogenic״ ו״fragrance-free״ הן מילים שימושיות לחפש על התווית.",
      "מחיר גבוה לא אומר תוצאה טובה יותר.",
    ],
    testing: ["בדיקת מטלית: כמות קטנה מאחורי האוזן או בפנים המרפק, פעמיים ביום במשך 7-10 ימים", "אם יש אדמומיות, גרד או נפיחות: מפסיקים"],
    sources: ["aadTestProducts", "aadPickMoisturizer", "aadSunscreenChoose", "aadBudget"],
  },
  {
    id: "hair",
    title: "מוצרי שיער",
    subtitle: "אחיזה, גימור, פריז",
    lovePlaceholder: "למשל: אוהב שיער עם נפח ומראה מט, אחיזה שמחזיקה עד הערב",
    options: HAIR,
    general: [
      "מתחילים בכמות בגודל אפונה ומוסיפים לפי הצורך.",
      "מפזרים בין כפות הידיים לפני שמכניסים לשיער, מאחור לפנים.",
      "קליי ופייבר נותנים מט ואחיזה. פומייד נותן ברק. קרם נותן מראה טבעי.",
      "חום ממייבש: על חום בינוני, ועם מוצר הגנה אם משתמשים הרבה.",
    ],
    testing: ["לנסות על שיער יבש ועל שיער לח מעט, ולראות מה עובד טוב יותר", "לבדוק איך השיער נראה אחרי 6 שעות"],
    sources: ["aadHair", "aadHairHabits", "aadCurly", "aadLeaveIn"],
  },
  {
    id: "body",
    title: "גוף ומקלחת",
    subtitle: "סבון, תחליב, ריח",
    lovePlaceholder: "למשל: אוהב סבון עם ריח מתוק שנשאר על העור, אבל העור שלי מתייבש",
    options: BODY,
    hasIntensity: true,
    general: [
      "מים פושרים ולא חמים מדי, ומקלחת קצרה, מייבשים פחות את העור.",
      "תחליב לחות מיד אחרי המקלחת, כשהעור עדיין מעט לח.",
      "ריח חזק בסבון ובתחליב יכול להתנגש עם הבושם. עדיף משפחת ריח אחת.",
    ],
    testing: ["לבדוק אם העור מתוח או מגרד אחרי מקלחת"],
    sources: ["aadDry", "nhsBodyOdour"],
  },
  {
    id: "oral",
    title: "פה ושיניים",
    subtitle: "משחה, טעם, רגישות",
    lovePlaceholder: "למשל: לא אוהב מנטה חזק, השיניים רגישות לקר, רוצה נשימה רעננה",
    options: ORAL,
    general: [
      "הדבר החשוב במשחה הוא פלואוריד. הטעם הוא עניין אישי.",
      "שתי דקות, פעמיים ביום. בסוף יורקים ולא שוטפים מיד, כדי שהפלואוריד יישאר.",
      "חוט דנטלי או מברשת בין-שינית פעם ביום.",
      "מי פה הם תוספת, לא תחליף לצחצוח.",
    ],
    testing: ["לתת למוצר חדש 2-4 שבועות לפני שמחליטים על רגישות"],
    sources: ["nhsTeeth", "adaMouthrinse", "nhsBadBreath"],
  },
];

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<AdvisorCat, CategoryDef>;
