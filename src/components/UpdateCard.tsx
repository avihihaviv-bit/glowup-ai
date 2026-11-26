"use client";
import { RefreshCw, CheckCircle2, Download } from "lucide-react";
import { applyUpdate, BUILT_AT, CURRENT_VERSION, useUpdateCheck } from "@/lib/updates";
import { Button, Card, SectionTitle } from "./ui";

export function UpdateCard() {
  const { state, latest, check } = useUpdateCheck();
  return (
    <Card className="space-y-3">
      <SectionTitle>
        <span className="flex items-center gap-2"><Download className="size-4 text-accent" /> גרסה ועדכונים</span>
      </SectionTitle>
      <p className="text-sm text-muted">
        גרסה מותקנת: <code dir="ltr">{CURRENT_VERSION}</code>
        {BUILT_AT && <> · {new Date(BUILT_AT).toLocaleDateString("he-IL")}</>}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {state === "available" ? (
          <Button icon={<RefreshCw className="size-4" />} onClick={() => applyUpdate(latest)}>עדכון עכשיו</Button>
        ) : (
          <Button variant="secondary" loading={state === "checking"} icon={<RefreshCw className="size-4" />} onClick={check}>בדיקת עדכונים</Button>
        )}
        {state === "latest" && <span className="flex items-center gap-1 text-sm text-green"><CheckCircle2 className="size-4" /> יש לך את הגרסה האחרונה</span>}
        {state === "available" && <span className="text-sm text-accent-strong">יש גרסה חדשה (<code dir="ltr">{latest}</code>)</span>}
        {state === "noserver" && <span className="text-sm text-muted">בגרסת התצוגה אין שרת, והיא מתעדכנת לבד.</span>}
        {state === "error" && <span className="text-sm text-warn">אין חיבור כרגע. נסו שוב.</span>}
      </div>
      <p className="text-xs text-dim">העדכון טוען את הגרסה החדשה במקום. הנתונים שלך שמורים במכשיר ולא נמחקים, והאייקון במסך הבית נשאר.</p>
    </Card>
  );
}
