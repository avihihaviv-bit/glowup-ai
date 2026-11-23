"use client";
import { useEffect, useMemo, useState } from "react";
import { Wand2, ImagePlus, Info } from "lucide-react";
import type { Hairstyle } from "@/lib/knowledge";
import { useStore } from "@/lib/store";
import { useAIStatus, postJSON } from "@/lib/api";
import { blobToBase64, getImage, prepareImage } from "@/lib/images";
import { Button, ErrorBox, Spinner } from "./ui";

/** Real hairstyle preview via image generation. Clearly a simulation, never a guarantee. */
export function HairStudio({ style }: { style: Hairstyle }) {
  const status = useAIStatus();
  const scan = useStore((s) => s.scans[0]);
  const [src, setSrc] = useState<Blob | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!src && scan?.images.front) getImage(scan.images.front).then((b) => b && setSrc(b));
  }, [scan, src]);
  const srcUrl = useMemo(() => (src ? URL.createObjectURL(src) : null), [src]);
  useEffect(() => () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
  }, [srcUrl]);

  async function generate() {
    if (!src) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await postJSON<{ image: string }>("/api/hair-preview", {
        image: { mediaType: "image/jpeg", data: await blobToBase64(src) },
        style: `${style.nameEn} (${style.name})`,
        details: style.barberScript,
      });
      setOut(res.image);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Wand2 className="size-4 text-accent" /> תצוגה על התמונה שלי
      </div>
      {!status.loading && !status.imageGen ? (
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" /> התכונה דורשת שירות יצירת תמונות (OPENAI_API_KEY בשרת). Claude לא יוצר תמונות, ולכן אין כאן תצוגה מזויפת.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {srcUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={srcUrl} alt="התמונה המקורית" className="aspect-square w-full rounded-xl object-cover" />
              ) : (
                <div className="grid aspect-square place-items-center rounded-xl bg-surface-2 text-xs text-muted">אין תמונה</div>
              )}
              <div className="mt-1 text-center text-[11px] text-dim">מקור</div>
            </div>
            <div>
              {busy ? (
                <div className="grid aspect-square place-items-center rounded-xl bg-surface-2">
                  <Spinner />
                </div>
              ) : out ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={out} alt={`הדמיה: ${style.name}`} className="aspect-square w-full rounded-xl object-cover" />
              ) : (
                <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-line text-xs text-muted">ההדמיה תופיע כאן</div>
              )}
              <div className="mt-1 text-center text-[11px] text-dim">הדמיה</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm text-muted hover:text-fg">
              <ImagePlus className="size-4" /> תמונה אחרת
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setSrc(await prepareImage(f, 1024)); setOut(null); } }} />
            </label>
            <Button size="sm" disabled={!src} loading={busy} onClick={generate}>
              יצירת הדמיה
            </Button>
            {out && (
              <a href={out} download={`hairstyle-${style.id}.png`} className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm text-accent">
                שמירה
              </a>
            )}
          </div>
          {err && (
            <div className="mt-2">
              <ErrorBox message={err} />
            </div>
          )}
          <p className="mt-2 text-[11px] text-dim">הדמיה ממוחשבת להמחשה בלבד. התוצאה האמיתית תלויה בשיער, במרקם ובספר. התמונה נשלחת לשירות חיצוני רק כשלוחצים על יצירה.</p>
        </>
      )}
    </div>
  );
}
