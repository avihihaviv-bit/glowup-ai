import type { MetadataRoute } from "next";

/** Web app manifest: lets the app be added to the phone home screen with its own icon and open full screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GLOWUP AI",
    short_name: "GLOWUP",
    description: "מאמן אישי לטיפוח, שיער, סטייל, יציבה וכושר.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "he",
    background_color: "#f5f9ff",
    theme_color: "#f5f9ff",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "סריקת פנים", url: "/face", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "מאמן AI", url: "/coach", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "יועץ מוצרים", url: "/advisor", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
