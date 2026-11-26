"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Cpu, Sparkles, Trash2, Layers, IdCard, GitCompare } from "lucide-react";
import { useStore } from "@/lib/store";
import { unpackLandmarks } from "@/lib/face/metrics";
import { FACE_CATEGORIES, type FaceScanReport } from "@/lib/schemas";
import type { FaceScan } from "@/lib/types";
import { FACE_SHAPE_INFO, type FaceShape } from "@/lib/knowledge";
import { blobToBase64, getImage, prepareImage } from "@/lib/images";
import { fetchStatus, postJSON, profileContext, useAIStatus } from "@/lib/api";
import { useImageUrl } from "../StoredImage";
import { cn, dateKey, heDate } from "@/lib/utils";
import { Badge, Button, Card, ErrorBox, Modal, SectionTitle, Segmented, Spinner } from "../ui";
import { LandmarkOverlay } from "./LandmarkOverlay";
import { Face3D } from "./Face3D";
import { FaceProfileCard } from "./FaceProfileCard";
import { PhotoRatings } from "../PhotoRatings";

const TITLES: Record<(typeof FACE_CATEGORIES)[number], string> = {
  faceShape: "צורת פנים",
  proportions: "פרופורציות",
  symmetry: "תצפיות סימטריה",
  jawline: "קו הלסת",
  chin: "סנטר",
  cheekbones: "עצמות לחיים",
  brows: "גבות",
  eyeArea: "אזור העיניים",
  underEye: "מתחת לעיניים",
  nose: "פרופורציות האף",
  lips: "אזור השפתיים",
  skin: "מראה העור",
  facialPosture: "יציבת ראש ופנים",
  photoQuality: "איכות התמונה",
};

type CardData = { observation: string; meaning: string; confidence: "low" | "medium" | "high"; recommendations: string[]; cannotConclude: string };

/** Cards that can be computed on-device from landmarks and image quality (used without AI, and shown next to AI). */
function localCards(scan: FaceScan): Partial<Record<(typeof FACE_CATEGORIES)[number], CardData>> {
  const o = scan.observations;
  const q = scan.quality.front;
  if (!o || !q) return {};
  const shape = FACE_SHAPE_INFO[o.shapeGuess as FaceShape];
  const asym = o.asymmetry < 0.02 ? "מאוזנים מאוד בתמונה הזו" : o.asymmetry < 0.04 ? "עם הבדלים קלים בין הצדדים, כמו אצל רוב האנשים" : "עם הבדלים נראים בין הצדדים, שלרוב נובעים מזווית הראש, תאורה או הבעה";
  const thirds = o.midToLower < 0.85 ? "השליש התחתון נראה ארוך יחסית לאמצעי" : o.midToLower > 1.15 ? "השליש האמצעי נראה ארוך יחסית לתחתון" : "השליש האמצעי והתחתון נראים דומים באורכם";
  return {
    faceShape: {
      observation: `לפי נקודות הציון, הצורה הקרובה היא ${shape?.label ?? o.shapeGuess}. ${shape?.identify ?? ""}`,
      meaning: shape?.goal ?? "",
      confidence: "low",
      recommendations: [`משקפיים שעשויים להתאים: ${shape?.glasses.join(", ") ?? "-"}`, "בדקו תסרוקות מתאימות בעמוד השיער"],
      cannotConclude: "צורת פנים מתמונה אחת היא הערכה גסה. זווית, עדשה ושיער משנים אותה.",
    },
    proportions: {
      observation: `${thirds}. רוחב הפנים ביחס לגובה בתמונה ${o.widthToHeight > 0.85 ? "רחב יחסית" : o.widthToHeight < 0.74 ? "מוארך יחסית" : "מאוזן"}.`,
      meaning: "פרופורציות עוזרות לבחור תסרוקת שמוסיפה גובה או רוחב לפי הצורך.",
      confidence: "low",
      recommendations: ["לפנים מוארכות: נפח בצדדים או פוני", "לפנים רחבות: גובה למעלה וצדדים קצרים"],
      cannotConclude: "אין כאן מדידה במילימטרים. היחסים מחושבים בתוך תמונה אחת ומושפעים מהעדשה.",
    },
    symmetry: {
      observation: `הצדדים ${asym}.`,
      meaning: "אסימטריה קלה היא טבעית לגמרי ואינה פגם. היא משפיעה בעיקר על בחירת צד לשביל בשיער.",
      confidence: "low",
      recommendations: ["נסו שביל בצד שבו השיער נופל באופן טבעי", "צלמו מחדש באותה תאורה כדי להשוות"],
      cannotConclude: "תמונה אחת לא מראה סימטריה אמיתית. זווית של כמה מעלות משנה את התוצאה.",
    },
    facialPosture: {
      observation: Math.abs(o.rollDeg) > 4 ? "הראש מוטה מעט לצד בתמונה." : "הראש ישר בתמונה.",
      meaning: "יציבת ראש וצוואר משפיעה על איך שהפנים והלסת נראות בתמונות.",
      confidence: "medium",
      recommendations: ["Chin tucks 10 פעמים ביום", "מסך בגובה העיניים"],
      cannotConclude: "אי אפשר להסיק על יציבת הצוואר או עמוד השדרה מתמונת פנים.",
    },
    photoQuality: {
      observation: `בהירות ${q.brightness}/255, ${q.sharpness > 120 ? "חדה" : "מעט רכה"}, ${q.width}×${q.height}px.${q.issues.length ? " יש מה לשפר." : " מתאימה לניתוח."}`,
      meaning: "תמונות עקביות (אותו אור, זווית ומרחק) הן הבסיס להשוואה אמיתית לאורך זמן.",
      confidence: "high",
      recommendations: ["אור יום רך מול הפנים", "מצלמה בגובה העיניים, במרחק זרוע", "בלי פילטרים"],
      cannotConclude: "איכות התמונה לא אומרת דבר על המראה עצמו.",
    },
  };
}

function ReportCard({ k, ai, local, aiReady, onRunAI, busy }: { k: (typeof FACE_CATEGORIES)[number]; ai?: CardData; local?: CardData; aiReady?: boolean; onRunAI?: () => void; busy?: boolean }) {
  const [open, setOpen] = useState(false);
  const c = ai ?? local;
  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <button onClick={() => setOpen((x) => !x)} className="flex w-full items-start gap-3 p-4 text-start" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{TITLES[k]}</span>
            {c && <Badge tone={c.confidence === "high" ? "green" : c.confidence === "medium" ? "accent" : "default"}>ביטחון {{ low: "נמוך", medium: "בינוני", high: "גבוה" }[c.confidence]}</Badge>}
            {!ai && local && (
              <Badge>
                <Cpu className="size-3" /> חושב במכשיר
              </Badge>
            )}
          </div>
          <p className={cn("mt-1 text-sm text-muted", !open && "line-clamp-2")}>
            {c ? c.observation : aiReady ? "הקטגוריה הזו מגיעה מדוח ה-AI, שעוד לא נוצר לסריקה הזו." : "דורש ניתוח AI. במצב דמו מוצגות רק התצפיות שחושבו במכשיר."}
          </p>
        </div>
        {c && <ChevronDown className={cn("mt-1 size-4 shrink-0 text-dim transition", open && "rotate-180")} />}
      </button>
      {!c && aiReady && onRunAI && (
        <div className="px-4 pb-4">
          <Button size="sm" variant="secondary" loading={busy} icon={<Sparkles className="size-4" />} onClick={onRunAI}>
            יצירת דוח AI מלא
          </Button>
        </div>
      )}
      {open && c && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3 text-sm">
          <div>
            <div className="text-xs font-medium text-dim">מה זה אומר</div>
            <p className="text-muted">{c.meaning}</p>
          </div>
          {c.recommendations.length > 0 && (
            <div>
              <div className="text-xs font-medium text-dim">המלצות</div>
              <ul className="mt-1 space-y-1">
                {c.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-muted">
                    <span className="text-accent">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
            <b className="text-fg">מה אי אפשר להסיק: </b>
            {c.cannotConclude}
          </div>
          {ai && local && (
            <div className="rounded-xl border border-line p-3 text-xs text-muted">
              <b className="text-fg">מנקודות הציון במכשיר: </b>
              {local.observation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ScanReport({ scan }: { scan: FaceScan }) {
  const ai = useAIStatus();
  const scans = useStore((s) => s.scans);
  const updateScan = useStore((s) => s.updateScan);
  const removeScan = useStore((s) => s.removeScan);
  const frontUrl = useImageUrl(scan.images.front);
  const [view, setView] = useState<"photo" | "3d">("photo");
  const [mesh, setMesh] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [profileCard, setProfileCard] = useState(false);
  const [compare, setCompare] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const points = useMemo(() => unpackLandmarks(scan.landmarks), [scan.landmarks]);
  const report = scan.report?.data as FaceScanReport | undefined;
  const local = useMemo(() => localCards(scan), [scan]);

  useEffect(() => {
    if (scan.images.front) getImage(scan.images.front).then((b) => setFrontBlob(b ?? null));
  }, [scan.images.front]);

  async function runAI() {
    setBusy(true);
    setErr(null);
    try {
      const { aiEnabled } = await fetchStatus();
      if (!aiEnabled) throw new Error("AI לא מוגדר בשרת");
      const enc = async (id?: string) => {
        if (!id) return undefined;
        const b = await getImage(id);
        return b ? { mediaType: "image/jpeg" as const, data: await blobToBase64(await prepareImage(b, 1024, 0.85)) } : undefined;
      };
      const o = scan.observations!;
      const res = await postJSON<{ report: FaceScanReport }>("/api/face-scan", {
        profile: profileContext(useStore.getState().profile),
        front: await enc(scan.images.front),
        left: await enc(scan.images.left),
        right: await enc(scan.images.right),
        observations: `יחס רוחב/גובה ${o.widthToHeight.toFixed(2)}, לסת/לחיים ${o.jawToCheek.toFixed(2)}, מצח/לחיים ${o.foreheadToCheek.toFixed(2)}, אמצעי/תחתון ${o.midToLower.toFixed(2)}, סטייה בין צדדים ${o.asymmetry.toFixed(3)}, הטיה ${o.rollDeg.toFixed(1)}°, צורה משוערת ${o.shapeGuess}`,
      });
      updateScan(scan.id, { report: { source: "ai", date: dateKey(), data: res.report } });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const previous = scans.find((s) => s.id !== scan.id && s.date <= scan.date && s.createdAt < scan.createdAt);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">דוח סריקה · {heDate(scan.date)}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge>ניתוח מתמונה דו-ממדית</Badge>
            {report ? <Badge tone="accent">דוח AI</Badge> : <Badge>תצפיות מהמכשיר בלבד</Badge>}
            <Badge>{Object.keys(scan.images).length} תמונות</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<IdCard className="size-4" />} onClick={() => setProfileCard(true)}>
            Face Profile Card
          </Button>
          {previous && (
            <Button variant="secondary" icon={<GitCompare className="size-4" />} onClick={() => setCompare(true)}>
              השוואה לסריקה קודמת
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <Segmented<"photo" | "3d">
            value={view}
            onChange={setView}
            options={[
              { value: "photo", label: "תמונה ונקודות" },
              { value: "3d", label: "תלת-ממד משוער" },
            ]}
          />
          {view === "photo" ? (
            frontUrl ? (
              <>
                <LandmarkOverlay src={frontUrl} landmarks={points} show={mesh} />
                <button onClick={() => setMesh((m) => !m)} className="inline-flex min-h-10 items-center gap-1.5 text-sm text-accent">
                  <Layers className="size-4" /> {mesh ? "הסתרת רשת הנקודות" : "הצגת רשת הנקודות"}
                </button>
              </>
            ) : (
              <div className="skeleton aspect-[3/4] rounded-3xl" />
            )
          ) : (
            <Face3D points={points} aspect={scan.observations?.aspect ?? 0.75} />
          )}
        </div>

        <div className="space-y-3 lg:col-span-3">
          {report?.summary && (
            <Card className="bg-gradient-to-br from-white to-accent-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-strong">
                <Sparkles className="size-4" /> סיכום
              </div>
              <p className="mt-1 text-sm text-muted">{report.summary}</p>
            </Card>
          )}
          {!report && (
            <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {ai.aiEnabled ? "בסריקה הזו לא אושרה שליחת תמונות, אז מוצגות רק התצפיות מהמכשיר. לחיצה על הכפתור שולחת את התמונות לשרת לניתוח בלבד ויוצרת דוח מלא של 14 קטגוריות." : "מצב דמו: מוצגות רק תצפיות שחושבו במכשיר מנקודות הציון. לדוח מלא צריך מפתח AI בשרת."}
              </p>
              {ai.aiEnabled && (
                <Button loading={busy} icon={<Sparkles className="size-4" />} onClick={runAI}>
                  יצירת דוח AI מלא
                </Button>
              )}
            </Card>
          )}
          {busy && <Spinner label="ה-AI כותב את הדוח…" />}
          {err && <ErrorBox message={err} onRetry={runAI} />}
          <div className="grid gap-3">
            {FACE_CATEGORIES.map((k) => (
              <ReportCard key={k} k={k} ai={report?.cards?.[k]} local={local[k]} aiReady={ai.aiEnabled} onRunAI={runAI} busy={busy} />
            ))}
          </div>
          {report && (report.groomingPriorities.length > 0 || report.hairstyleIdeas.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <SectionTitle>עדיפויות טיפוח</SectionTitle>
                <ul className="space-y-1 text-sm text-muted">
                  {report.groomingPriorities.map((g, i) => (
                    <li key={i}>• {g}</li>
                  ))}
                </ul>
              </Card>
              <Card>
                <SectionTitle>רעיונות לתסרוקת</SectionTitle>
                <ul className="space-y-1 text-sm text-muted">
                  {report.hairstyleIdeas.map((g, i) => (
                    <li key={i}>• {g}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>

      <PhotoRatings scope="face" image={frontBlob} />

      <div>
        {confirmDel ? (
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={() => removeScan(scan.id)}>
              מחיקת הסריקה והתמונות
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>
              ביטול
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDel(true)}>
            מחיקת הסריקה
          </Button>
        )}
      </div>

      <Modal open={profileCard} onClose={() => setProfileCard(false)} title="Face Profile Card" wide>
        {profileCard && <FaceProfileCard scan={scan} />}
      </Modal>
      <Modal open={compare} onClose={() => setCompare(false)} title="השוואה בין סריקות" wide>
        {compare && previous && <CompareScans a={previous} b={scan} />}
      </Modal>
    </div>
  );
}

function ScanPhoto({ scan }: { scan: FaceScan }) {
  const url = useImageUrl(scan.images.front);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
  ) : (
    <div className="skeleton aspect-[3/4] rounded-2xl" />
  );
}

export function CompareScans({ a, b }: { a: FaceScan; b: FaceScan }) {
  const qa = a.quality.front, qb = b.quality.front;
  const lightDiff = qa && qb ? Math.abs(qa.brightness - qb.brightness) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((s) => (
          <div key={s.id}>
            <ScanPhoto scan={s} />
            <div className="mt-1 text-center text-xs text-muted">{heDate(s.date)}</div>
          </div>
        ))}
      </div>
      <div className={cn("rounded-2xl p-3 text-sm", lightDiff > 25 ? "bg-warn-bg text-warn" : "bg-surface-2 text-muted")}>
        {lightDiff > 25
          ? `התאורה שונה בין התמונות (הפרש בהירות ${lightDiff}). חלק מההבדלים שרואים כנראה נובעים מהאור ולא משינוי אמיתי.`
          : "תנאי התאורה דומים יחסית. עדיין, זווית ומרחק שונים יכולים להסביר הבדלים קטנים."}
      </div>
      <p className="text-xs text-dim">האפליקציה לא מסיקה שיפור מתוך השוואת תמונות. ההשוואה היא בשבילך, בתנאים עקביים ככל האפשר.</p>
    </div>
  );
}
