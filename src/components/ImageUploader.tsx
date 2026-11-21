"use client";
import { useRef, useState, type DragEvent } from "react";
import { Camera, ImagePlus, RefreshCw, ShieldCheck } from "lucide-react";
import { prepareImage } from "@/lib/images";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

export function ImageUploader({
  value,
  onChange,
  hint,
  tips,
  aspect = "aspect-[4/5]",
}: {
  value: Blob | null;
  onChange: (b: Blob | null) => void;
  hint: string;
  tips?: string[];
  aspect?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file?: File | null) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("יש לבחור קובץ תמונה (JPG / PNG / WEBP / HEIC).");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("הקובץ גדול מדי (מקסימום 25MB).");
      return;
    }
    setBusy(true);
    try {
      const blob = await prepareImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
    } catch {
      setError("לא הצלחנו לקרוא את התמונה. נסו פורמט JPG או PNG.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    handle(e.dataTransfer.files?.[0]);
  }

  const shown = value ? preview : null;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition",
          aspect,
          drag ? "border-accent bg-accent-soft" : "border-line bg-surface-2",
        )}
      >
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown} alt="תצוגה מקדימה" className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
              <Button size="sm" variant="secondary" icon={<RefreshCw className="size-4" />} onClick={() => fileRef.current?.click()}>
                החלפה
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  onChange(null);
                  setPreview(null);
                }}
              >
                הסרה
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center"
            disabled={busy}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <ImagePlus className="size-7" />
            </div>
            <div className="font-medium">{busy ? "מעבד תמונה…" : "העלו תמונה או גררו לכאן"}</div>
            <div className="max-w-xs text-sm text-muted">{hint}</div>
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<ImagePlus className="size-4" />} onClick={() => fileRef.current?.click()}>
          מהגלריה
        </Button>
        <Button size="sm" variant="secondary" icon={<Camera className="size-4" />} onClick={() => camRef.current?.click()}>
          צילום
        </Button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => (handle(e.target.files?.[0]), (e.target.value = ""))} />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => (handle(e.target.files?.[0]), (e.target.value = ""))}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {tips && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {tips.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-dim">
        <ShieldCheck className="size-3.5 text-green" /> התמונה נשמרת רק במכשיר שלך. מטא-דאטה (כמו מיקום) מוסרת אוטומטית.
      </p>
    </div>
  );
}
