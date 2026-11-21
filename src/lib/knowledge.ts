/**
 * Curated, rules-based knowledge used by:
 *  - Demo mode (no API key) — clearly labeled as general guidance, not AI output
 *  - Haircut gallery & personal matching
 */

export type FaceShape = "oval" | "round" | "square" | "rectangle" | "heart" | "diamond" | "triangle";

export const FACE_SHAPE_INFO: Record<
  FaceShape,
  { label: string; identify: string; goal: string; glasses: string[]; avoidGlasses: string[]; brows: string[] }
> = {
  oval: {
    label: "אובלית",
    identify: "אורך הפנים מעט גדול מהרוחב, לסת מעוגלת בעדינות, מצח ולסת ברוחב דומה.",
    goal: "מבנה מאוזן — רוב התסרוקות מתאימות. אפשר לבחור לפי סגנון ונוחות.",
    glasses: ["מלבניות", "Wayfarer", "עגולות מתונות", "Aviator"],
    avoidGlasses: ["מסגרות גדולות מאוד שמסתירות את קו הגבות"],
    brows: ["קשת רכה וטבעית", "שמירה על העובי הטבעי"],
  },
  round: {
    label: "עגולה",
    identify: "אורך ורוחב דומים, לחיים מלאות, לסת רכה ללא זוויות בולטות.",
    goal: "ליצור גובה וזוויות — נפח למעלה, צדדים קצרים/צמודים יותר.",
    glasses: ["מלבניות", "מרובעות", "Browline", "מסגרות עם זוויות"],
    avoidGlasses: ["עגולות קטנות", "מסגרות צרות מאוד"],
    brows: ["קשת מוגדרת עם זווית קלה שמוסיפה גובה", "להימנע מגבות עגולות מאוד"],
  },
  square: {
    label: "מרובעת",
    identify: "לסת רחבה וזוויתית, מצח רחב, אורך ורוחב קרובים.",
    goal: "לרכך זוויות או להדגיש אותן בצורה נקייה — טקסטורה למעלה, קווים רכים.",
    glasses: ["עגולות", "אובליות", "Panto", "מסגרות דקות"],
    avoidGlasses: ["מרובעות כבדות וזוויתיות"],
    brows: ["קשת מעוגלת מעט שמרככת את הזוויות"],
  },
  rectangle: {
    label: "מלבנית / מוארכת",
    identify: "פנים ארוכות באופן ברור מהרוחב, מצח, לחיים ולסת ברוחב דומה.",
    goal: "לא להוסיף גובה — לשמור נפח בצדדים, פוני או שיער שנופל על המצח עוזר.",
    glasses: ["מסגרות עבות/גבוהות", "Wayfarer", "מרובעות גדולות"],
    avoidGlasses: ["מסגרות צרות וקטנות"],
    brows: ["גבות ישרות יחסית שמרחיבות את הפנים אופקית"],
  },
  heart: {
    label: "לב",
    identify: "מצח רחב ולחיים בולטות, סנטר צר יותר.",
    goal: "לאזן בין חלק עליון רחב לסנטר צר — נפח בינוני למעלה, אורך/נפח בגובה הלסת.",
    glasses: ["מסגרות תחתונות כבדות יותר", "אובליות", "Cat-eye עדין", "חסרות מסגרת"],
    avoidGlasses: ["מסגרות כבדות מאוד בחלק העליון"],
    brows: ["קשת רכה ומעוגלת, לא דקה מדי"],
  },
  diamond: {
    label: "יהלום",
    identify: "עצמות לחיים רחבות, מצח וסנטר צרים יותר.",
    goal: "להוסיף רוחב במצח ובסנטר — פוני, נפח בצדדים העליונים.",
    glasses: ["אובליות", "Cat-eye", "Browline", "חסרות מסגרת"],
    avoidGlasses: ["מסגרות צרות שמדגישות את רוחב הלחיים"],
    brows: ["קשת מעוגלת שמרחיבה את המצח"],
  },
  triangle: {
    label: "משולש",
    identify: "לסת רחבה יותר מהמצח.",
    goal: "להוסיף נפח למעלה ולצדדים העליונים, לא להוסיף רוחב בלסת.",
    glasses: ["Browline", "Cat-eye", "מסגרות עם דגש עליון"],
    avoidGlasses: ["מסגרות צרות וקטנות"],
    brows: ["גבות מוגדרות וממולאות שמוסיפות משקל לחלק העליון"],
  },
};

export interface Hairstyle {
  id: string;
  name: string;
  nameEn: string;
  audience: "masc" | "fem" | "any";
  length: "buzz" | "short" | "medium" | "long";
  textures: ("straight" | "wavy" | "curly" | "coily")[];
  faceShapes: FaceShape[];
  maintenance: "נמוכה" | "בינונית" | "גבוהה";
  description: string;
  barberScript: string;
  styling: string;
  shape: "buzz" | "crop" | "quiff" | "side" | "fringe" | "curly" | "bob" | "lob" | "long" | "layers" | "bun" | "mullet";
  hue: number;
}

export const HAIRSTYLES: Hairstyle[] = [
  {
    id: "buzz", name: "באז קאט", nameEn: "Buzz Cut", audience: "any", length: "buzz",
    textures: ["straight", "wavy", "curly", "coily"], faceShapes: ["oval", "square", "diamond"], maintenance: "נמוכה",
    description: "נקי, מינימליסטי וקל לתחזוקה. מדגיש את מבנה הפנים והגבות.",
    barberScript: "מכונה אחידה מספר 2-3 על כל הראש, קו עורף מעוגל טבעי, יישור קו מצח קל.",
    styling: "אין צורך במוצר. לחות לקרקפת ו-SPF בשמש.", shape: "buzz", hue: 260,
  },
  {
    id: "crop", name: "קרופ טקסטורי", nameEn: "Textured French Crop", audience: "masc", length: "short",
    textures: ["straight", "wavy"], faceShapes: ["oval", "round", "rectangle", "heart", "triangle"], maintenance: "נמוכה",
    description: "חלק עליון קצר עם טקסטורה ופוני קצר קדימה. מודרני ומחמיא, מוסיף נפח בלי גובה מוגזם.",
    barberScript: "צדדים פייד נמוך/בינוני ממספר 1 עד 3, למעלה 4-6 ס״מ עם טקסטורה במספריים (point cutting), פוני קצר ישר או מעט לא אחיד.",
    styling: "מעט משחה מט (matte paste) על שיער יבש, לפזר באצבעות קדימה.", shape: "crop", hue: 280,
  },
  {
    id: "quiff", name: "קוויף מודרני", nameEn: "Modern Quiff", audience: "masc", length: "short",
    textures: ["straight", "wavy"], faceShapes: ["round", "square", "oval", "triangle"], maintenance: "בינונית",
    description: "נפח קדמי כלפי מעלה ואחורה. יוצר גובה — מצוין לפנים עגולות ומרובעות.",
    barberScript: "צדדים מספר 2 בהדרגה (taper), למעלה 7-9 ס״מ בחלק הקדמי ומתקצר לכיוון הכתר, להשאיר משקל קדימה.",
    styling: "פן עם מברשת עגולה כלפי מעלה, ואז מעט קליי.", shape: "quiff", hue: 300,
  },
  {
    id: "side-part", name: "שביל צד קלאסי", nameEn: "Classic Side Part", audience: "masc", length: "short",
    textures: ["straight", "wavy"], faceShapes: ["oval", "round", "square", "heart", "diamond"], maintenance: "בינונית",
    description: "מסודר ואלגנטי, מתאים לעבודה ולאירועים. השביל יוצר אסימטריה שמחמיאה לרוב המבנים.",
    barberScript: "צדדים במספריים או מספר 3-4, למעלה 6-8 ס״מ, שביל טבעי בצד שבו השיער נופל, מעבר רך בלי פייד חד.",
    styling: "פומייד עם ברק בינוני, מסרק דק לשביל.", shape: "side", hue: 230,
  },
  {
    id: "curly-top", name: "תלתלים למעלה + פייד", nameEn: "Curly Top Fade", audience: "masc", length: "short",
    textures: ["curly", "coily", "wavy"], faceShapes: ["oval", "round", "rectangle", "heart"], maintenance: "בינונית",
    description: "מנצל את התלתלים הטבעיים, צדדים נקיים ונפח מוגדר למעלה.",
    barberScript: "פייד בינוני מ-0.5 עד 2, למעלה להשאיר 5-8 ס״מ, לגזור תלתלים יבשים (curl by curl) לצורה מעוגלת.",
    styling: "קרם תלתלים על שיער רטוב, לא להבריש יבש. מגבת מיקרופייבר.", shape: "curly", hue: 150,
  },
  {
    id: "fringe", name: "פרינג׳ / פוני רך", nameEn: "Soft Fringe", audience: "any", length: "medium",
    textures: ["straight", "wavy"], faceShapes: ["rectangle", "heart", "diamond", "oval"], maintenance: "בינונית",
    description: "פוני שנופל קדימה מקצר חזותית פנים מוארכות ומאזן מצח רחב.",
    barberScript: "להשאיר אורך קדמי שמגיע לגבות, צדדים בינוניים במספריים, שכבות רכות בכתר.",
    styling: "ספריי מלח ים ופן קל קדימה.", shape: "fringe", hue: 200,
  },
  {
    id: "mid-flow", name: "פלואו באורך בינוני", nameEn: "Medium Flow", audience: "any", length: "medium",
    textures: ["straight", "wavy"], faceShapes: ["oval", "square", "diamond", "triangle"], maintenance: "בינונית",
    description: "שיער שנופל אחורה באורך האוזניים-סנטר. רגוע, אופנתי ומרכך קווי לסת חדים.",
    barberScript: "לגדל אורך אחיד, לנקות קצוות כל 6-8 שבועות, שכבות ארוכות לנפח, לא לקצר צדדים.",
    styling: "קרם עיצוב קל, לייבש באוויר או עם מפזר.", shape: "long", hue: 180,
  },
  {
    id: "mullet", name: "מאלט מודרני", nameEn: "Modern Mullet", audience: "any", length: "medium",
    textures: ["straight", "wavy", "curly"], faceShapes: ["oval", "heart", "diamond"], maintenance: "בינונית",
    description: "קצר בצדדים, ארוך מאחור, עם טקסטורה. נועז ועדכני.",
    barberScript: "צדדים טייפר קצר סביב האוזניים, למעלה 5-7 ס״מ עם טקסטורה, מאחור להשאיר 8-12 ס״מ.",
    styling: "ספריי טקסטורה + מעט קרם.", shape: "mullet", hue: 20,
  },
  {
    id: "pixie", name: "פיקסי", nameEn: "Pixie Cut", audience: "fem", length: "short",
    textures: ["straight", "wavy"], faceShapes: ["oval", "heart", "diamond"], maintenance: "בינונית",
    description: "קצר ונשי, מדגיש עיניים ועצמות לחיים.",
    barberScript: "צדדים ועורף קצרים במספריים, למעלה 5-8 ס״מ עם שכבות, פוני צד ארוך.",
    styling: "מעט וקס או משחה לטקסטורה.", shape: "crop", hue: 320,
  },
  {
    id: "bob", name: "בוב קלאסי", nameEn: "Classic Bob", audience: "fem", length: "short",
    textures: ["straight", "wavy"], faceShapes: ["oval", "heart", "diamond", "rectangle"], maintenance: "בינונית",
    description: "קו נקי בגובה הלסת. אלגנטי ומוסיף נפח בגובה הסנטר.",
    barberScript: "קו ישר בגובה הלסת או מעט מתחת, שכבות פנימיות עדינות לתנועה, שביל צד או אמצע.",
    styling: "פן עם מברשת עגולה כלפי פנים או גלים רכים.", shape: "bob", hue: 340,
  },
  {
    id: "lob", name: "לוב (בוב ארוך)", nameEn: "Long Bob (Lob)", audience: "any", length: "medium",
    textures: ["straight", "wavy", "curly"], faceShapes: ["round", "square", "oval", "heart", "triangle"], maintenance: "נמוכה",
    description: "אורך כתפיים, מאריך חזותית פנים עגולות ומרובעות. קל לתחזוקה.",
    barberScript: "אורך בין הסנטר לכתפיים, מעט ארוך יותר מקדימה, שכבות ארוכות, קצוות מרוככים.",
    styling: "ספריי טקסטורה ופן מהיר או גלים במחליק.", shape: "lob", hue: 10,
  },
  {
    id: "long-layers", name: "שכבות ארוכות", nameEn: "Long Layers", audience: "any", length: "long",
    textures: ["straight", "wavy", "curly"], faceShapes: ["round", "square", "oval", "heart", "diamond", "triangle"], maintenance: "נמוכה",
    description: "שיער ארוך עם שכבות שמוסיפות תנועה ומסגרות את הפנים.",
    barberScript: "לשמור אורך, שכבות שמתחילות בגובה הסנטר, פריימינג קדמי (face-framing), ניקוי קצוות 1-2 ס״מ.",
    styling: "קרם לחות לקצוות, ייבוש עם מפזר לנפח.", shape: "layers", hue: 40,
  },
  {
    id: "curtain", name: "קרטן בנגס", nameEn: "Curtain Bangs", audience: "any", length: "long",
    textures: ["straight", "wavy"], faceShapes: ["rectangle", "heart", "square", "oval"], maintenance: "בינונית",
    description: "פוני מחולק באמצע שנופל לצדדים. מרכך זוויות ומקצר פנים מוארכות.",
    barberScript: "פוני מחולק באמצע, קצר ביותר בגובה הגבות ומתארך לעצמות הלחיים, משתלב בשכבות.",
    styling: "פן עם מברשת עגולה לצדדים.", shape: "fringe", hue: 60,
  },
  {
    id: "natural-curls", name: "תלתלים טבעיים מעוצבים", nameEn: "Defined Natural Curls", audience: "any", length: "medium",
    textures: ["curly", "coily"], faceShapes: ["oval", "round", "square", "heart", "diamond", "rectangle", "triangle"], maintenance: "בינונית",
    description: "גזירה שמכבדת את דפוס התלתל, צורה מאוזנת בלי משולש.",
    barberScript: "גזירה יבשה (dry cut / DevaCut) לפי התלתל, שכבות שמונעות צורת משולש, לא להדליל עם מספריים מדלדלות.",
    styling: "שיטת LOC: חומר לחות, שמן, קרם. לייבש עם מפזר.", shape: "curly", hue: 120,
  },
  {
    id: "bun", name: "באן / קוקו גבוה", nameEn: "Top Knot / Bun", audience: "any", length: "long",
    textures: ["straight", "wavy", "curly", "coily"], faceShapes: ["oval", "round", "heart", "diamond"], maintenance: "נמוכה",
    description: "פתרון מהיר ומסודר לשיער ארוך, מוסיף גובה.",
    barberScript: "לשמור אורך שמאפשר איסוף, ניקוי קצוות, אפשר צדדים קצרים (undercut) להופעה נקייה.",
    styling: "גומייה ללא מתכת, ספריי לשערות סוררות.", shape: "bun", hue: 90,
  },
  {
    id: "taper-waves", name: "טייפר + גלים", nameEn: "Taper with 360 Waves", audience: "masc", length: "buzz",
    textures: ["coily", "curly"], faceShapes: ["oval", "square", "round", "diamond"], maintenance: "גבוהה",
    description: "קצר מאוד עם דפוס גלים, נקי ומוקפד.",
    barberScript: "טייפר עדין בעורף ובפאות, למעלה מספר 1.5-2 אחיד, יישור קו (line-up).",
    styling: "הברשה יומית במברשת רכה, דורג (durag) בלילה, קרם לחות.", shape: "buzz", hue: 210,
  },
];

export const COLOR_RULES = {
  neutrals: ["שחור", "לבן", "אפור", "נייבי", "בז׳", "קרם", "חום", "זית"],
  pairs: [
    { a: "נייבי", b: "לבן", note: "קלאסי ונקי, עובד כמעט תמיד" },
    { a: "זית", b: "קרם", note: "גוונים אדמתיים, רגוע ובוגר" },
    { a: "אפור", b: "בורדו", note: "ניגוד עדין ואלגנטי" },
    { a: "שחור", b: "חום קאמל", note: "יוקרתי ומינימליסטי" },
    { a: "תכלת", b: "חאקי", note: "קיצי ונינוח" },
    { a: "בז׳", b: "חום כהה", note: "טון על טון שנראה מוקפד" },
  ],
  rules: [
    "כלל 3 הצבעים: עד 3 צבעים עיקריים בלבוש אחד (ניטרלים נחשבים 'רקע').",
    "צבע חזק אחד + ניטרלים = מראה בטוח ומודרני.",
    "התאימו חגורה לנעליים באותה משפחת צבע.",
    "גוונים כהים למטה ובהירים למעלה יוצרים מראה מאוזן.",
    "טון על טון (גוונים שונים של אותו צבע) נראה יוקרתי ופשוט.",
  ],
};

export const SKIN_CONCERNS = [
  "אקנה קל / פצעונים",
  "עור שמנוני",
  "יובש / קשקשת",
  "רגישות / אדמומיות",
  "כתמים / גוון לא אחיד",
  "נקבוביות",
  "שגרה פשוטה בלבד",
] as const;
