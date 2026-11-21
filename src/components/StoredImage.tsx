"use client";
import { useEffect, useState } from "react";
import { getImage } from "@/lib/images";
import { cn } from "@/lib/utils";

export function useImageUrl(imageId?: string) {
  const [state, setState] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!imageId) return;
    let objectUrl: string | null = null;
    let alive = true;
    getImage(imageId).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setState({ id: imageId, url: objectUrl });
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);
  return state && state.id === imageId ? state.url : null;
}

export function StoredImage({ imageId, alt, className }: { imageId?: string; alt: string; className?: string }) {
  const url = useImageUrl(imageId);
  if (!url) return <div className={cn("skeleton", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cn("object-cover", className)} />;
}

export function Avatar({ imageId, name, size = 48 }: { imageId?: string; name: string; size?: number }) {
  const url = useImageUrl(imageId);
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent/80 to-green/70 font-bold text-black ring-2 ring-line"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="size-full object-cover" />
      ) : (
        (name || "?").trim().charAt(0)
      )}
    </div>
  );
}
