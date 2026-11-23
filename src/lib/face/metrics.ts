/**
 * Measurements derived from MediaPipe landmarks of ONE 2D photo. They are relative ratios inside that photo,
 * strongly affected by head angle, lens and expression. The UI presents them qualitatively and labels them
 * as approximations. Nothing here is an attractiveness judgment.
 */
export type P = { x: number; y: number; z: number };
export type ScanStep = "front" | "left" | "right";

const d = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

// Landmark indices (MediaPipe canonical face mesh)
const L = {
  top: 10, chin: 152, cheekR: 234, cheekL: 454, jawR: 172, jawL: 397, foreR: 103, foreL: 332,
  eyeOutR: 33, eyeOutL: 263, mouthR: 61, mouthL: 291, nose: 1, subnasale: 2, browMid: 168,
  browR: 105, browL: 334,
};

export interface PoseCheck {
  found: boolean;
  /** 0.5 = facing camera. > 0.5 = head turned to the subject's left, < 0.5 = to the subject's right (unmirrored image). */
  turn: number;
  rollDeg: number;
  size: number; // face height as a fraction of frame height
  cx: number;
  cy: number;
}

export function poseCheck(lm: P[] | undefined): PoseCheck {
  if (!lm?.length) return { found: false, turn: 0.5, rollDeg: 0, size: 0, cx: 0.5, cy: 0.5 };
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of lm) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const span = lm[L.cheekL].x - lm[L.cheekR].x;
  const turn = Math.abs(span) < 1e-6 ? 0.5 : (lm[L.nose].x - lm[L.cheekR].x) / span;
  const a = lm[L.eyeOutR], b = lm[L.eyeOutL];
  const rollDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return { found: true, turn, rollDeg, size: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export type Issue = "noFace" | "tooFar" | "tooClose" | "offCenter" | "tilted" | "turnFront" | "turnMoreLeft" | "turnMoreRight" | "dark" | "bright" | "blurry";

/** Returns what's wrong for the given capture step (empty = good to capture). */
export function captureIssues(step: ScanStep, pc: PoseCheck, light?: { brightness: number; sharpness: number }): Issue[] {
  const out: Issue[] = [];
  if (!pc.found) return ["noFace"];
  if (pc.size < 0.3) out.push("tooFar");
  if (pc.size > 0.88) out.push("tooClose");
  if (Math.abs(pc.cx - 0.5) > 0.18 || Math.abs(pc.cy - 0.5) > 0.2) out.push("offCenter");
  if (Math.abs(pc.rollDeg) > 9) out.push("tilted");
  if (step === "front" && Math.abs(pc.turn - 0.5) > 0.1) out.push("turnFront");
  if (step === "left" && pc.turn < 0.68) out.push("turnMoreLeft");
  if (step === "right" && pc.turn > 0.32) out.push("turnMoreRight");
  if (light) {
    if (light.brightness < 60) out.push("dark");
    if (light.brightness > 215) out.push("bright");
    if (light.sharpness < 60) out.push("blurry");
  }
  return out;
}

export const ISSUE_TEXT: Record<Issue, string> = {
  noFace: "לא זוהו פנים. ודאו שכל הפנים בפריים ושאין הסתרה.",
  tooFar: "התקרבו מעט למצלמה.",
  tooClose: "התרחקו מעט מהמצלמה.",
  offCenter: "מרכזו את הפנים בתוך המסגרת.",
  tilted: "ישרו את הראש (בלי להטות לצד).",
  turnFront: "הסתכלו ישר למצלמה.",
  turnMoreLeft: "סובבו את הראש עוד שמאלה (כ-45°).",
  turnMoreRight: "סובבו את הראש עוד ימינה (כ-45°).",
  dark: "התאורה חלשה. עמדו מול חלון או מקור אור רך.",
  bright: "יש יותר מדי אור ישיר. נסו אור רך יותר.",
  blurry: "התמונה מטושטשת. החזיקו יציב או נקו את העדשה.",
};

export type Level = "low" | "typical" | "high";
export interface FrontObservations {
  widthToHeight: number;
  jawToCheek: number;
  foreheadToCheek: number;
  midToLower: number;
  asymmetry: number; // mean mirrored offset / face width
  rollDeg: number;
  turn: number;
  shapeGuess: "oval" | "round" | "square" | "rectangle" | "heart" | "diamond" | "triangle";
}

export function frontObservations(lm: P[]): FrontObservations {
  const faceW = d(lm[L.cheekR], lm[L.cheekL]);
  const faceH = d(lm[L.top], lm[L.chin]);
  const jaw = d(lm[L.jawR], lm[L.jawL]);
  const fore = d(lm[L.foreR], lm[L.foreL]);
  const mid = d(lm[L.browMid], lm[L.subnasale]);
  const lower = d(lm[L.subnasale], lm[L.chin]);
  // midline through brow-mid and chin
  const m1 = lm[L.browMid], m2 = lm[L.chin];
  const mx = m2.x - m1.x, my = m2.y - m1.y, ml = Math.hypot(mx, my) || 1;
  const signed = (p: P) => ((p.x - m1.x) * my - (p.y - m1.y) * mx) / ml;
  const pairs: [number, number][] = [[L.eyeOutR, L.eyeOutL], [L.mouthR, L.mouthL], [L.cheekR, L.cheekL], [L.browR, L.browL], [L.jawR, L.jawL]];
  const asym = pairs.reduce((s, [a, b]) => s + Math.abs(Math.abs(signed(lm[a])) - Math.abs(signed(lm[b]))), 0) / pairs.length / (faceW || 1);
  const w2h = faceW / (faceH || 1);
  const j2c = jaw / (faceW || 1);
  const f2c = fore / (faceW || 1);
  let shapeGuess: FrontObservations["shapeGuess"] = "oval";
  if (f2c - j2c > 0.12) shapeGuess = "heart";
  else if (j2c - f2c > 0.08) shapeGuess = "triangle";
  else if (f2c < 0.72 && j2c < 0.72) shapeGuess = "diamond";
  else if (w2h > 0.86) shapeGuess = j2c > 0.8 ? "square" : "round";
  else if (w2h < 0.72) shapeGuess = j2c > 0.8 ? "rectangle" : "oval";
  const pc = poseCheck(lm);
  return { widthToHeight: w2h, jawToCheek: j2c, foreheadToCheek: f2c, midToLower: mid / (lower || 1), asymmetry: asym, rollDeg: pc.rollDeg, turn: pc.turn, shapeGuess };
}

/** Compact landmark storage (x, y, z rounded) so scans fit in local storage. */
export function packLandmarks(lm: P[]): number[] {
  const out: number[] = [];
  for (const p of lm) out.push(+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4));
  return out;
}
export function unpackLandmarks(a: number[]): P[] {
  const out: P[] = [];
  for (let i = 0; i + 2 < a.length; i += 3) out.push({ x: a[i], y: a[i + 1], z: a[i + 2] });
  return out;
}
