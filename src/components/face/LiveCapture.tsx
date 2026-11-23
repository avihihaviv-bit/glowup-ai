"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { getVideoLandmarker } from "@/lib/face/landmarker";
import { captureIssues, ISSUE_TEXT, poseCheck, type Issue, type P, type ScanStep } from "@/lib/face/metrics";
import { Button } from "../ui";
import { cn } from "@/lib/utils";

/** Live camera with an alignment guide driven by real landmark detection in the browser. */
export function LiveCapture({ step, onCapture, onClose }: { step: ScanStep; onCapture: (b: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>(["noFace"]);
  const [loading, setLoading] = useState(true);
  const readySince = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let alive = true;
    let last = 0;
    let lastLight = 0;
    let light = { brightness: 128, sharpness: 100 };
    const probe = document.createElement("canvas");
    probe.width = 96;
    probe.height = 72;
    const pctx = probe.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const runner = await getVideoLandmarker();
        if (!alive) return;
        setLoading(false);
        const tick = (now: number) => {
          if (!alive) return;
          if (now - last > 110 && v.readyState >= 2) {
            last = now;
            if (pctx && now - lastLight > 450) {
              lastLight = now;
              pctx.drawImage(v, 0, 0, 96, 72);
              const { data } = pctx.getImageData(0, 0, 96, 72);
              let sum = 0, lap = 0;
              const g = new Float32Array(96 * 72);
              for (let i = 0; i < g.length; i++) {
                g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
                sum += g[i];
              }
              for (let y = 1; y < 71; y++) for (let x = 1; x < 95; x++) { const i = y * 96 + x; const q = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - 96] - g[i + 96]; lap += q * q; }
              light = { brightness: sum / g.length, sharpness: lap / (94 * 70) };
            }
            const res = runner.detectForVideo(v, now);
            const lm = res.faceLandmarks[0] as P[] | undefined;
            const iss = captureIssues(step, poseCheck(lm), light);
            setIssues(iss);
            if (iss.length === 0) {
              readySince.current ??= now;
              setReady(now - readySince.current > 500);
            } else {
              readySince.current = null;
              setReady(false);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setLoading(false);
        setError((e as Error).name === "NotAllowedError" ? "לא ניתנה הרשאה למצלמה. אפשר להעלות תמונה במקום." : "לא ניתן להפעיל מצלמה במכשיר הזה. אפשר להעלות תמונה במקום.");
      }
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [step]);

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onCapture(b), "image/jpeg", 0.92);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0d1b33]">
      <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full -scale-x-100 object-cover sm:aspect-[4/3]" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
        <defs>
          <mask id="hole">
            <rect width="100" height="100" fill="white" />
            <ellipse cx="50" cy="48" rx="24" ry="32" fill="black" />
          </mask>
        </defs>
        <rect width="100" height="100" fill="rgba(13,27,51,0.45)" mask="url(#hole)" />
        <ellipse cx="50" cy="48" rx="24" ry="32" fill="none" stroke={ready ? "#8dd8ff" : "rgba(255,255,255,0.7)"} strokeWidth="0.6" strokeDasharray={ready ? "0" : "2 1.5"} />
      </svg>
      {ready && <div className="scanline pointer-events-none absolute inset-x-[26%] top-[16%] h-[22%] bg-gradient-to-b from-transparent via-cyan/40 to-transparent" />}
      <button onClick={onClose} className="absolute end-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-fg" aria-label="סגירת מצלמה">
        <X className="size-5" />
      </button>
      <div className="absolute inset-x-3 bottom-3 space-y-2">
        <div className={cn("mx-auto w-fit rounded-full px-4 py-2 text-center text-sm font-medium shadow-lg", ready ? "bg-accent text-white" : "bg-white/95 text-fg")} aria-live="polite">
          {loading ? "מפעילים מצלמה וזיהוי פנים…" : error ? error : ready ? "מצוין, אפשר לצלם" : ISSUE_TEXT[issues[0]]}
        </div>
        {!error && (
          <Button className="w-full" size="lg" disabled={!ready} icon={<Camera className="size-4" />} onClick={capture}>
            צילום
          </Button>
        )}
      </div>
    </div>
  );
}
