"use client";
import Link from "next/link";
import { ScanFace } from "lucide-react";
import { useStore } from "@/lib/store";
import { heDate } from "@/lib/utils";
import { Badge, Card, SectionTitle } from "./ui";
import { StoredImage } from "./StoredImage";

export function ScanHistoryCard() {
  const scans = useStore((s) => s.scans);
  return (
    <Card>
      <SectionTitle action={<Link href="/face" className="text-xs font-medium text-accent">לסריקות</Link>}>
        <span className="flex items-center gap-2"><ScanFace className="size-4 text-accent" /> היסטוריית סריקות</span>
      </SectionTitle>
      {scans.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {scans.slice(0, 10).map((s) => (
            <Link key={s.id} href="/face" className="w-24 shrink-0">
              {s.images.front ? <StoredImage imageId={s.images.front} alt="" className="aspect-[3/4] w-full rounded-xl" /> : <div className="skeleton aspect-[3/4] rounded-xl" />}
              <div className="mt-1 text-center text-[11px] text-muted">{heDate(s.date)}</div>
              <div className="text-center"><Badge>{s.report ? "AI" : "מכשיר"}</Badge></div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">עוד אין סריקות. השוואה בין סריקות מוצגת רק כשתנאי הצילום דומים.</p>
      )}
    </Card>
  );
}
