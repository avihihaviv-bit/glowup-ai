"use client";
import type { FaceLandmarker as FL, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

/**
 * MediaPipe Face Landmarker running fully in the browser (no photo leaves the device for this step).
 * It returns 478 2D landmarks plus a relative depth (z) estimated from a single image. That z is a model
 * estimate, not a depth-sensor measurement, and the UI labels it that way.
 */
let imageRunner: Promise<FL> | null = null;
let videoRunner: Promise<FL> | null = null;

async function create(mode: "IMAGE" | "VIDEO"): Promise<FL> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const opts = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate },
    runningMode: mode,
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
    outputFaceBlendshapes: false,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, opts("GPU"));
  } catch {
    return FaceLandmarker.createFromOptions(fileset, opts("CPU"));
  }
}

export function getImageLandmarker() {
  imageRunner ??= create("IMAGE").catch((e) => {
    imageRunner = null;
    throw e;
  });
  return imageRunner;
}

export function getVideoLandmarker() {
  videoRunner ??= create("VIDEO").catch((e) => {
    videoRunner = null;
    throw e;
  });
  return videoRunner;
}

export async function getTesselation() {
  const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
  return FaceLandmarker.FACE_LANDMARKS_TESSELATION;
}

export async function detectImage(blob: Blob): Promise<FaceLandmarkerResult | null> {
  const runner = await getImageLandmarker();
  const bmp = await createImageBitmap(blob);
  try {
    const res = runner.detect(bmp);
    return res.faceLandmarks.length ? res : null;
  } finally {
    bmp.close();
  }
}
