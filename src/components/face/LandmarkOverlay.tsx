"use client";
import { useEffect, useRef, useState } from "react";
import { getTesselation } from "@/lib/face/landmarker";
import type { P } from "@/lib/face/metrics";

/** Draws the real detected face mesh over the photo. */
export function LandmarkOverlay({ src, landmarks, show }: { src: string; landmarks: P[]; show: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [tess, setTess] = useState<{ start: number; end: number }[] | null>(null);

  useEffect(() => {
    getTesselation().then(setTess).catch(() => setTess([]));
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img || !tess) return;
    const draw = () => {
      const w = img.clientWidth, h = img.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!show) return;
      // object-cover mapping
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.max(w / iw, h / ih);
      const ox = (w - iw * scale) / 2, oy = (h - ih * scale) / 2;
      const X = (p: P) => ox + p.x * iw * scale;
      const Y = (p: P) => oy + p.y * ih * scale;
      ctx.strokeStyle = "rgba(141,216,255,0.55)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (const e of tess) {
        const a = landmarks[e.start], b = landmarks[e.end];
        if (!a || !b) continue;
        ctx.moveTo(X(a), Y(a));
        ctx.lineTo(X(b), Y(b));
      }
      ctx.stroke();
      ctx.fillStyle = "#2878f0";
      for (const i of [33, 263, 1, 61, 291, 152, 10, 234, 454, 168]) {
        const p = landmarks[i];
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(X(p), Y(p), 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (img.complete) draw();
    img.onload = draw;
    const ro = new ResizeObserver(draw);
    ro.observe(img);
    return () => ro.disconnect();
  }, [tess, landmarks, show, src]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="תמונת החזית מהסריקה" className="aspect-[3/4] w-full object-cover" />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" aria-hidden />
    </div>
  );
}
