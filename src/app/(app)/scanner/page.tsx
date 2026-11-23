"use client";
import { useMemo, useState } from "react";
import { ScanBarcode, Trash2, Search, AlertTriangle, Database, Tag } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAIStatus, postJSON, profileContext } from "@/lib/api";
import { blobToBase64, saveImage } from "@/lib/images";
import type { ProductLabel } from "@/lib/schemas";
import type { ScannedProduct } from "@/lib/types";
import { compatNotes } from "@/lib/compat";
import { SOURCES } from "@/data/sources";
import { dateKey, heDate, uid } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, ErrorBox, Input, PageHeader, SectionTitle, Spinner } from "@/components/ui";
import { ImageUploader } from "@/components/ImageUploader";

type Obf = { name: string; brand: string; barcode: string; ingredients: string[] };
const TYPE_LABEL: Record<string, string> = {
  cleanser: "ניקוי", moisturizer: "לחות", spf: "הגנה מהשמש", serum: "סרום", exfoliant: "פילינג", shampoo: "שמפו", conditioner: "מרכך",
  styling: "עיצוב שיער", deodorant: "דאודורנט", toothpaste: "משחת שיניים", mouthwash: "מי פה", fragrance: "בושם", other: "אחר",
};

export default function ScannerPage() {
  const ai = useAIStatus();
  const products = useStore((s) => s.scannedProducts);
  const add = useStore((s) => s.addScannedProduct);
  const remove = useStore((s) => s.removeScannedProduct);
  const [img, setImg] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<{ label: ProductLabel; db: Obf | null } | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [results, setResults] = useState<Obf[] | null>(null);
  const notes = useMemo(() => compatNotes(products), [products]);

  async function scan() {
    if (!img) return;
    setBusy(true);
    setErr(null);
    setResults(null);
    try {
      const res = await postJSON<{ label: ProductLabel; db: Obf | null }>("/api/product-scan", { image: { mediaType: "image/jpeg", data: await blobToBase64(img) }, profile: profileContext(useStore.getState().profile) });
      setPending(res);
      setConfirmName([res.label.brand, res.label.name].filter(Boolean).join(" "));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function lookup() {
    setBusy(true);
    try {
      const r = await fetch(`/api/product-lookup?q=${encodeURIComponent(confirmName)}`);
      const d = await r.json();
      setResults(d.results ?? []);
      if (d.error) setErr(d.error);
    } finally {
      setBusy(false);
    }
  }

  async function save(db: Obf | null) {
    if (!pending) return;
    const l = pending.label;
    const ingredients = db?.ingredients.length ? db.ingredients : l.ingredientsOnLabel;
    const p: ScannedProduct = {
      id: uid("sp"),
      date: dateKey(),
      name: db?.name || l.name || confirmName || "מוצר ללא שם",
      brand: db?.brand || l.brand,
      type: l.type,
      ingredients,
      ingredientsSource: db?.ingredients.length ? "database" : l.ingredientsOnLabel.length ? "label" : "none",
      purpose: l.purpose,
      howToUse: l.howToUse,
      warnings: l.warnings,
      confidence: db ? "high" : l.confidence,
      barcode: db?.barcode || l.barcode || undefined,
      imageId: img ? await saveImage(img) : undefined,
    };
    add(p);
    setPending(null);
    setResults(null);
    setImg(null);
  }

  const lowConf = pending && (pending.label.confidence === "low" || !pending.label.name);

  return (
    <div className="space-y-6">
      <PageHeader title="סורק מוצרים" subtitle="צלמו את התווית. המידע מגיע רק ממה שכתוב על המוצר או ממאגר Open Beauty Facts, בלי ניחושים." icon={<ScanBarcode className="size-5" />} />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle>צילום התווית</SectionTitle>
          <ImageUploader value={img} onChange={setImg} hint="צד אחורי עם רשימת הרכיבים, או ברקוד" aspect="aspect-square" tips={["אור טוב, בלי השתקפות", "רשימת הרכיבים ברורה וחדה", "אם יש ברקוד, שיהיה בפריים"]} />
          {ai.aiEnabled ? (
            <Button className="mt-4 w-full" size="lg" disabled={!img} loading={busy && !pending} onClick={scan}>
              סריקה
            </Button>
          ) : !ai.loading ? (
            <p className="mt-3 rounded-2xl bg-warn-bg p-3 text-sm text-warn">קריאת תוויות דורשת AI מחובר (ANTHROPIC_API_KEY). במצב דמו הסורק לא פעיל, ולא יוצגו פרטים מומצאים.</p>
          ) : null}
          {err && (
            <div className="mt-3">
              <ErrorBox message={err} />
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {busy && !pending && <Spinner label="קוראים את התווית…" />}
          {pending && (
            <Card>
              <SectionTitle action={<Badge tone={pending.label.confidence === "high" ? "green" : "default"}>ביטחון {{ low: "נמוך", medium: "בינוני", high: "גבוה" }[pending.label.confidence]}</Badge>}>מה נקרא מהתווית</SectionTitle>
              {!pending.label.readable ? (
                <p className="text-sm text-warn">התווית לא קריאה. נסו צילום קרוב וחד יותר, או חפשו לפי שם.</p>
              ) : (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-dim">שם</dt><dd>{pending.label.name || "—"}</dd></div>
                  <div><dt className="text-xs text-dim">מותג</dt><dd>{pending.label.brand || "—"}</dd></div>
                  <div><dt className="text-xs text-dim">סוג</dt><dd>{TYPE_LABEL[pending.label.type]}</dd></div>
                  <div><dt className="text-xs text-dim">ברקוד</dt><dd dir="ltr" className="text-start">{pending.label.barcode || "—"}</dd></div>
                </dl>
              )}
              {pending.db ? (
                <div className="mt-3 rounded-2xl bg-accent-soft p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-accent-strong"><Database className="size-4" /> נמצא במאגר לפי הברקוד</div>
                  <p className="mt-1 text-muted">{pending.db.brand} {pending.db.name} · {pending.db.ingredients.length} רכיבים</p>
                  <Button className="mt-2" size="sm" onClick={() => save(pending.db)}>שמירה עם נתוני המאגר</Button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {lowConf && <p className="text-sm text-muted">לא בטוחים בזיהוי. אשרו או תקנו את שם המוצר:</p>}
                  <div className="flex gap-2">
                    <Input id="confirm-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder="מותג ושם המוצר" aria-label="שם המוצר" />
                    <Button variant="secondary" icon={<Search className="size-4" />} disabled={confirmName.trim().length < 2} loading={busy} onClick={lookup}>חיפוש</Button>
                  </div>
                  {results && (results.length ? (
                    <ul className="space-y-1.5">
                      {results.map((r, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-2 text-sm">
                          <span className="min-w-0 truncate">{r.brand} {r.name} <span className="text-xs text-dim">· {r.ingredients.length} רכיבים</span></span>
                          <Button size="sm" variant="secondary" onClick={() => save(r)}>זה המוצר</Button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted">לא נמצא במאגר.</p>)}
                  <Button size="sm" variant="ghost" onClick={() => save(null)}>שמירה רק עם מה שנקרא מהתווית</Button>
                </div>
              )}
            </Card>
          )}

          {notes.length > 0 && (
            <Card>
              <SectionTitle>בדיקת התאמה בין המוצרים שלך</SectionTitle>
              <ul className="space-y-2">
                {notes.map((n, i) => (
                  <li key={i} className="rounded-2xl border border-line p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
                      <div>
                        <p>{n.text}</p>
                        <p className="mt-1 text-xs text-dim">{n.products.join(" · ")}</p>
                        {n.source && <a href={SOURCES[n.source].url} target="_blank" rel="noopener noreferrer" dir="ltr" className="mt-1 inline-block text-[11px] text-accent">{SOURCES[n.source].org} · {SOURCES[n.source].title}</a>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-dim">הבדיקה מתבססת רק על רשימות הרכיבים שנשמרו, ואינה תחליף להתייעצות עם רוקח/ת או רופא/ת עור.</p>
            </Card>
          )}
        </div>
      </div>

      <div>
        <SectionTitle>המוצרים שנסרקו</SectionTitle>
        {products.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {products.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="text-xs text-muted">{p.brand || "—"} · {TYPE_LABEL[p.type] ?? p.type} · {heDate(p.date)}</div>
                  </div>
                  <button onClick={() => remove(p.id)} className="grid size-9 place-items-center text-dim hover:text-danger" aria-label="מחיקה"><Trash2 className="size-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={p.ingredientsSource === "database" ? "accent" : "default"}>
                    <Tag className="size-3" /> רכיבים: {{ database: "מהמאגר", label: "מהתווית", none: "לא זמינים" }[p.ingredientsSource]}
                  </Badge>
                </div>
                {p.purpose && <p className="mt-2 text-sm text-muted">מטרה: {p.purpose}</p>}
                {p.howToUse && <p className="text-sm text-muted">שימוש: {p.howToUse}</p>}
                {p.warnings.length > 0 && <p className="mt-1 text-xs text-warn">{p.warnings.join(" · ")}</p>}
                {p.ingredients.length > 0 && (
                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer text-accent">רשימת רכיבים ({p.ingredients.length})</summary>
                    <p className="mt-1 leading-5" dir="ltr">{p.ingredients.join(", ")}</p>
                  </details>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ScanBarcode className="size-5" />} title="עוד לא נסרקו מוצרים" text="סרקו את המוצרים שיש לכם כדי לבדוק כפילויות ושילובים." />
        )}
      </div>
    </div>
  );
}
