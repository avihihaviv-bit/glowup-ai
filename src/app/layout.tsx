import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { LangSync } from "@/components/LangSync";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: "GLOWUP AI — המאמן האישי שלך",
  description: "מאמן אישי מבוסס AI לטיפוח, שיער, סטייל, יציבה וכושר. תוכנית 30 יום מותאמת אישית.",
  applicationName: "GLOWUP AI",
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" data-theme="dark" className={heebo.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <LangSync />
        {children}
      </body>
    </html>
  );
}
