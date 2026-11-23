"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getTesselation } from "@/lib/face/landmarker";
import type { P } from "@/lib/face/metrics";

/**
 * 3D view built from the 478 detected landmarks. Depth (z) is the landmark model's estimate from a single
 * 2D photo, not a depth-sensor scan. The caption under the canvas says so.
 */
function Mesh({ points, aspect, drag }: { points: P[]; aspect: number; drag: React.RefObject<{ x: number; y: number; active: boolean }> }) {
  const group = useRef<THREE.Group>(null);
  const [tess, setTess] = useState<{ start: number; end: number }[]>([]);
  useEffect(() => {
    getTesselation().then(setTess).catch(() => setTess([]));
  }, []);

  const { positions, lines } = useMemo(() => {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const cz = points.reduce((s, p) => s + p.z, 0) / points.length;
    const h = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y)) || 1;
    const k = 2.4 / h;
    const pos = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      pos[i * 3] = (p.x - cx) * aspect * k;
      pos[i * 3 + 1] = -(p.y - cy) * k;
      pos[i * 3 + 2] = -(p.z - cz) * aspect * k;
    });
    const ln = new Float32Array(tess.length * 6);
    tess.forEach((e, i) => {
      ln.set(pos.subarray(e.start * 3, e.start * 3 + 3), i * 6);
      ln.set(pos.subarray(e.end * 3, e.end * 3 + 3), i * 6 + 3);
    });
    return { positions: pos, lines: ln };
  }, [points, aspect, tess]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const d = drag.current!;
    if (d.active) {
      g.rotation.y = d.x;
      g.rotation.x = d.y;
    } else {
      g.rotation.y += (Math.sin(clock.elapsedTime * 0.5) * 0.55 - g.rotation.y) * 0.04;
      g.rotation.x += (0 - g.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={group}>
      {lines.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[lines, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#8dd8ff" transparent opacity={0.55} />
        </lineSegments>
      )}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#2878f0" size={0.028} sizeAttenuation />
      </points>
    </group>
  );
}

export function Face3D({ points, aspect }: { points: P[]; aspect: number }) {
  const drag = useRef({ x: 0, y: 0, active: false });
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white to-accent-soft">
      <div
        className="aspect-[3/4] w-full touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          start.current = { px: e.clientX, py: e.clientY, x: drag.current.x, y: drag.current.y };
          drag.current.active = true;
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          drag.current.x = start.current.x + (e.clientX - start.current.px) / 120;
          drag.current.y = Math.max(-0.8, Math.min(0.8, start.current.y + (e.clientY - start.current.py) / 160));
        }}
        onPointerUp={() => {
          start.current = null;
          drag.current.active = false;
        }}
      >
        <Canvas camera={{ position: [0, 0, 3.4], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <Mesh points={points} aspect={aspect} drag={drag} />
        </Canvas>
      </div>
      <p className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 px-3 py-2 text-center text-[11px] text-muted">
        מבנה תלת-ממדי משוער מ-478 נקודות שזוהו בתמונה. העומק הוא הערכה של המודל מתמונה רגילה, לא סריקת עומק.
      </p>
    </div>
  );
}
