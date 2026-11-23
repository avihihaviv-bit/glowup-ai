"use client";
import { useState } from "react";
import { Siren, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { SourceLinks } from "@/components/SourceLinks";
import type { SourceKey } from "@/data/sources";

const FIXES: { id: string; title: string; items: { problem: string; fix: string; avoid?: string }[]; sources?: SourceKey[] }[] = [
  {
    id: "hair",
    title: "שיער",
    items: [
      { problem: "השיער שמנוני ואין זמן לחפוף", fix: "שמפו יבש על השורשים, להמתין דקה ולפזר באצבעות.", avoid: "לא להעמיס מוצר. זה פתרון זמני." },
      { problem: "השיער שטוח אחרי כובע", fix: "להרטיב מעט את הידיים, לפזר מהשורש ולסדר עם מסרק.", avoid: "לא להוסיף שכבה עבה של ג׳ל." },
      { problem: "פריז ביום לח", fix: "טיפה של קרם עיצוב על כפות ידיים לחות, להחליק מלמעלה.", avoid: "לא להבריש שיער מתולתל יבש." },
      { problem: "יותר מדי מוצר", fix: "לספוג עם מגבת נייר, ולהבריש החוצה את העודף.", avoid: "לא לשטוף רק חלק מהראש." },
    ],
    sources: ["aadDryShampoo"],
  },
  {
    id: "clothes",
    title: "בגדים",
    items: [
      { problem: "חולצה מקומטת", fix: "מכשיר אדים, או לתלות בחדר רחצה עם מקלחת חמה כמה דקות.", avoid: "מגהץ חם מדי על בד עדין." },
      { problem: "כתם קטן", fix: "לספוג (לא לשפשף) עם מים קרים ומעט סבון, מהחוץ פנימה.", avoid: "לא מים חמים על כתם של חלבון או דם." },
      { problem: "כתמי דאודורנט לבנים", fix: "לשפשף בעדינות בד בבד, או עם גרב ניילון יבשה.", avoid: "לא להרטיב חזק לפני האירוע." },
      { problem: "כפתור נפל", fix: "סיכה קטנה מבפנים, או החלפת חולצה.", avoid: "לא דבק." },
      { problem: "שערות ומוך על בגד כהה", fix: "רולר מוך, או סלוטייפ סביב היד.", avoid: "" },
    ],
  },
  {
    id: "breath",
    title: "נשימה ופה",
    items: [
      { problem: "ריח פה אחרי אוכל", fix: "צחצוח אם אפשר. אחרת: מים, מסטיק ללא סוכר, וניקוי לשון בבית.", avoid: "מי פה הם לא תחליף לצחצוח." },
      { problem: "אוכל תקוע בשיניים", fix: "חוט דנטלי או קיסם עדין, בשירותים.", avoid: "לא חפצים חדים." },
      { problem: "פה יבש", fix: "לשתות מים, מסטיק ללא סוכר.", avoid: "" },
    ],
    sources: ["nhsBadBreath", "nhsTeeth"],
  },
  {
    id: "grooming",
    title: "טיפוח ועור",
    items: [
      { problem: "חתך קטן מגילוח", fix: "לחץ עדין עם בד נקי עד שהדימום נעצר, ואז לשטוף.", avoid: "לא לשים בושם או אלכוהול על החתך." },
      { problem: "פצעון לפני אירוע", fix: "להשאיר אותו. קומפרס קריר עוזר לאדמומיות באופן זמני.", avoid: "לא לסחוט, זה מגדיל אדמומיות ונפיחות." },
      { problem: "נפיחות בבוקר", fix: "קומפרס קריר כמה דקות, שתייה רגילה, תנועה.", avoid: "לא להניח קרח ישירות על העור, ולא לצמצם שתייה." },
      { problem: "עור מבריק", fix: "נייר ספיגה בעדינות.", avoid: "לא לשטוף שוב ושוב." },
      { problem: "זיעה לפני אירוע", fix: "לשטוף בית שחי במים, לייבש, דאודורנט על עור יבש, חולצה נוספת.", avoid: "" },
    ],
    sources: ["aadAcneTips", "mayoBags", "nhsBodyOdour"],
  },
];

export default function QuickFixPage() {
  const [open, setOpen] = useState<string>("hair");
  const cat = FIXES.find((f) => f.id === open)!;
  return (
    <div className="space-y-6">
      <PageHeader title="Emergency Quick Fix" subtitle="פתרונות מהירים ובטוחים לרגע האחרון." icon={<Siren className="size-5" />} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FIXES.map((f) => (
          <button key={f.id} onClick={() => setOpen(f.id)} aria-pressed={open === f.id} className={cn("min-h-14 rounded-2xl border text-sm font-semibold transition", open === f.id ? "border-accent bg-accent text-white" : "border-line bg-white text-muted")}>
            {f.title}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {cat.items.map((it) => (
          <Card key={it.problem} className="p-4">
            <div className="font-semibold">{it.problem}</div>
            <p className="mt-1 text-sm text-muted">{it.fix}</p>
            {it.avoid && <p className="mt-2 text-xs text-warn">{it.avoid}</p>}
          </Card>
        ))}
      </div>
      {cat.sources && (
        <Card className="p-4">
          <SourceLinks keys={cat.sources} />
        </Card>
      )}
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-accent" />
        פציעה, תגובה אלרגית, נפיחות פתאומית או כאב הם לא &quot;תיקון מהיר&quot;. במקרים כאלה פונים לעזרה רפואית.
      </div>
    </div>
  );
}
