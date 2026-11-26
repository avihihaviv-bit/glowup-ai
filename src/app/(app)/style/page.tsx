"use client";
import { useState } from "react";
import { Shirt, Sparkles } from "lucide-react";
import { useAIStatus } from "@/lib/api";
import { useAnalysis } from "@/lib/useAnalysis";
import { demoStyle } from "@/lib/demo";
import { COLOR_RULES } from "@/lib/knowledge";
import type { StyleAnalysis } from "@/lib/schemas";
import { Button, Card, ErrorBox, Field, Input, PageHeader, SectionTitle, Select, Spinner } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";
import { AnalysisHistory, CloseResult, StyleResult } from "@/components/results";

const COLORS = ["שחור", "לבן", "אפור", "נייבי", "בז׳", "קרם", "חום", "זית", "חום קאמל", "כחול", "תכלת", "ירוק", "בורדו", "אדום", "כתום", "צהוב", "חרדל", "סגול", "ורוד", "טורקיז", "חאקי"];

export default function StylePage() {
  const ai = useAIStatus();
  const { run, loading, error, record, setRecord } = useAnalysis("style");
  const [image, setImage] = useState<Blob | null>(null);
  const [occasion, setOccasion] = useState("");
  const [top, setTop] = useState("לבן");
  const [bottom, setBottom] = useState("נייבי");
  const [shoes, setShoes] = useState("לבן");

  const start = () => run({ image, extra: { occasion }, demo: (q) => demoStyle({ top, bottom, shoes, occasion, q }) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Style Analyzer"
        subtitle="העלו תמונת outfit וקבלו משוב על התאמת צבעים, פריטים ונעליים. מדרגים את הבגדים — לא אותך."
        icon={<Shirt className="size-5" />}
        actions={record && <CloseResult onClick={() => setRecord(null)} />}
      />
      {record ? (
        <StyleResult r={record.result as StyleAnalysis} source={record.source} fallback={record.fallback} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <SectionTitle>תמונת לבוש</SectionTitle>
            <ImageUploader value={image} onChange={setImage} hint="לבוש מלא מהראש עד הנעליים" tips={["מול מראה או עם טיימר", "אור יום, רקע פשוט", "אפשר לטשטש/לחתוך את הפנים — רק הבגדים חשובים"]} />
          </Card>
          <div className="space-y-4 lg:col-span-3">
            {!ai.loading && !ai.aiEnabled && (
              <Card>
                <SectionTitle>צבעי הפריטים (מצב דמו)</SectionTitle>
                <p className="mb-4 text-sm text-muted">במצב דמו הפריטים לא מזוהים מהתמונה — בחרו את הצבעים, והמערכת תבדוק התאמה לפי כללי צבע מקובלים.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["חלק עליון", top, setTop],
                      ["חלק תחתון", bottom, setBottom],
                      ["נעליים", shoes, setShoes],
                    ] as const
                  ).map(([l, v, fn]) => (
                    <Field key={l} label={l}>
                      <Select value={v} onChange={(e) => fn(e.target.value)}>
                        {COLORS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                </div>
              </Card>
            )}
            <Card>
              <Field label="לאיזה אירוע/הקשר? (אופציונלי)">
                <Input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="יומיומי, דייט, ראיון עבודה, אירוע ערב…" maxLength={80} />
              </Field>
              <div className="mt-4">
                {error && <ErrorBox message={error} onRetry={start} />}
                {loading ? (
                  <Spinner label={ai.aiEnabled ? "ה-AI מנתח את הלבוש…" : "בודקים התאמה…"} />
                ) : (
                  <Button size="lg" className="w-full" disabled={!image} icon={<Sparkles className="size-4" />} onClick={start}>
                    {ai.aiEnabled ? "נתח לבוש עם AI" : "בדוק התאמה (דמו)"}
                  </Button>
                )}
              </div>
            </Card>
            <Card>
              <SectionTitle>כללי צבע מהירים</SectionTitle>
              <ul className="space-y-1.5 text-sm text-muted">
                {COLOR_RULES.rules.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {COLOR_RULES.pairs.map((p) => (
                  <span key={p.a + p.b} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted" title={p.note}>
                    {p.a} + {p.b}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
      <AnalysisHistory type="style" onOpen={setRecord} />
    </div>
  );
}
