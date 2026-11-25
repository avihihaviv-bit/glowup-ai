import type { Metadata, Viewport } from "next";
import { Heebo, Inter } from "next/font/google";
import "./globals.css";
import { LangSync } from "@/components/LangSync";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "GLOWUP AI — המאמן האישי שלך",
  description: "מאמן אישי מבוסס AI לטיפוח, שיער, סטייל, יציבה וכושר. תוכנית 30 יום מותאמת אישית.",
  applicationName: "GLOWUP AI",
  // iPhone "Add to Home Screen": app name under the icon, full-screen launch.
  appleWebApp: { capable: true, title: "GLOWUP", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f9ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${heebo.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <LangSync />
        {children}
      </body>
    </html>
  );
}
