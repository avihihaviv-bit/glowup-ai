"use client";
import { useState } from "react";
import { ScanFace, History } from "lucide-react";
import { useStore } from "@/lib/store";
import { heDate } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader, Segmented } from "@/components/ui";
import { ScanWizard } from "@/components/face/ScanWizard";
import { ScanReport } from "@/components/face/ScanReport";
import { useImageUrl } from "@/components/StoredImage";
import { AnalysisHistory, FaceResult } from "@/components/results";
import type { FaceScan } from "@/lib/types";
import type { FaceAnalysis } from "@/lib/schemas";
import type { AnalysisRecord } from "@/lib/types";

type Tab = "scan" | "report" | "history";

export default function FacePage() {
  const scans = useStore((s) => s.scans);
  const [tab, setTab] = useState<Tab>(scans.length ? "report" : "scan");
  const [selected, setSelected] = useState<string | null>(null);
  const [legacy, setLegacy] = useState<AnalysisRecord | null>(null);
  const current = scans.find((s) => s.id === selected) ?? scans[0];

  return (
    <div className="space-y-6">
      <PageHeader title="סריקת פנים" subtitle="סריקה מודרכת מ-3 זוויות, נקודות ציון אמיתיות ודוח מפורט. בלי ציוני יופי." icon={<ScanFace className="size-5" />} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "scan", label: "סריקה חדשה" },
          { value: "report", label: "הדוח" },
          { value: "history", label: `היסטוריה (${scans.length})` },
        ]}
      />
      {tab === "scan" && (
        <ScanWizard
          onDone={(id) => {
            setSelected(id);
            setTab("report");
          }}
        />
      )}
      {tab === "report" &&
        (current ? (
          <ScanReport key={current.id} scan={current} />
        ) : (
          <EmptyState icon={<ScanFace className="size-5" />} title="עוד אין סריקות" text="בצעו סריקה ראשונה כדי לראות דוח." />
        ))}
      {tab === "history" && (
        <div className="space-y-4">
          {scans.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {scans.map((s) => (
                <ScanThumb
                  key={s.id}
                  scan={s}
                  onOpen={() => {
                    setSelected(s.id);
                    setTab("report");
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<History className="size-5" />} title="עוד אין היסטוריה" text="כל סריקה נשמרת כאן, ואפשר להשוות ביניהן." />
          )}
          {legacy ? <FaceResult r={legacy.result as FaceAnalysis} source={legacy.source} /> : <AnalysisHistory type="face" onOpen={setLegacy} />}
        </div>
      )}
    </div>
  );
}

function ScanThumb({ scan, onOpen }: { scan: FaceScan; onOpen: () => void }) {
  const url = useImageUrl(scan.images.front);
  return (
    <Card interactive className="overflow-hidden p-0">
      <button onClick={onOpen} className="block w-full text-start">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="skeleton aspect-[3/4]" />
        )}
        <div className="flex items-center justify-between p-3">
          <span className="text-sm font-medium">{heDate(scan.date)}</span>
          <Badge tone={scan.report ? "accent" : "default"}>{scan.report ? "AI" : "מכשיר"}</Badge>
        </div>
      </button>
    </Card>
  );
}
