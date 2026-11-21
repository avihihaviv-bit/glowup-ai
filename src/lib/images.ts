"use client";
import { createStore, del, get, set, clear, keys } from "idb-keyval";
import { uid } from "./utils";

/**
 * Photos are stored ONLY on this device (IndexedDB). They are never uploaded
 * anywhere except when the user explicitly runs an AI analysis — and even then
 * they are sent to the server just for that request and not stored.
 */
const store = typeof window !== "undefined" ? createStore("glowup-images", "images") : undefined;

export async function saveImage(blob: Blob): Promise<string> {
  const id = uid("img");
  await set(id, blob, store);
  return id;
}

export async function getImage(id: string): Promise<Blob | undefined> {
  return get(id, store);
}

export async function deleteImage(id?: string) {
  if (id) await del(id, store);
}

export async function clearImages() {
  await clear(store);
}

export async function countImages() {
  return (await keys(store)).length;
}

/** Resize + re-encode to JPEG (keeps payloads small and strips EXIF/GPS metadata). */
export async function prepareImage(file: File | Blob, maxSide = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  let w: number, h: number, source: CanvasImageSource;
  if (bitmap) {
    w = bitmap.width;
    h = bitmap.height;
    source = bitmap;
  } else {
    const img = await loadImg(file);
    w = img.naturalWidth;
    h = img.naturalHeight;
    source = img;
  }
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality),
  );
}

function loadImg(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("לא ניתן לקרוא את התמונה"));
    img.src = URL.createObjectURL(file);
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
