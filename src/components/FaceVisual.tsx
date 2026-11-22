"use client";
import { useImageUrl } from "./StoredImage";
import { cn } from "@/lib/utils";

/**
 * Hero visual for the scan card. With a scan photo it shows the user's own photo inside a scan frame.
 * Without one it shows a clearly labeled illustration. It never pretends to be a depth scan.
 */
export function FaceVisual({ imageId, label, className }: { imageId?: string; label: string; className?: string }) {
  const url = useImageUrl(imageId);
  return (
    <div className={cn("relative aspect-square w-full max-w-[280px]", className)}>
      {/* soft rings */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(141,216,255,0.55),rgba(220,235,255,0.25)_55%,transparent_70%)]" />
      <div className="absolute inset-[8%] rounded-full border border-accent/15" />
      <div className="absolute inset-[18%] rounded-full border border-accent/20" />
      <div className="absolute inset-[22%] overflow-hidden rounded-[38%] border border-white bg-gradient-to-b from-white to-accent-soft shadow-lift">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <svg viewBox="0 0 100 120" className="size-full p-[10%]" aria-hidden>
            <defs>
              <linearGradient id="fv" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8dd8ff" />
                <stop offset="100%" stopColor="#2878f0" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#fv)" strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
              <path d="M50 6c20 0 32 16 32 40 0 26-14 54-32 54S18 72 18 46C18 22 30 6 50 6z" />
              <path d="M30 44q8-5 16 0M54 44q8-5 16 0" />
              <path d="M50 46v22q-4 4 0 6q4-2 0-6" />
              <path d="M38 82q12 7 24 0" />
              <path d="M18 46q32 10 64 0M22 66q28 12 56 0M50 6v94M30 14q-6 40 6 80M70 14q6 40-6 80" opacity="0.35" />
            </g>
            <g fill="#2878f0">
              {[[30, 44], [46, 44], [54, 44], [70, 44], [50, 68], [38, 82], [62, 82], [50, 98], [22, 60], [78, 60]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.3" />
              ))}
            </g>
          </svg>
        )}
        <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-cyan/50 to-transparent" />
      </div>
      {/* frame corners */}
      {["start-[18%] top-[18%] border-s-2 border-t-2 rounded-ss-xl", "end-[18%] top-[18%] border-e-2 border-t-2 rounded-se-xl", "start-[18%] bottom-[18%] border-s-2 border-b-2 rounded-es-xl", "end-[18%] bottom-[18%] border-e-2 border-b-2 rounded-ee-xl"].map((c) => (
        <span key={c} className={cn("absolute size-6 border-accent", c)} />
      ))}
      <span className="absolute inset-x-0 bottom-[4%] mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-muted shadow-sm">{label}</span>
    </div>
  );
}
