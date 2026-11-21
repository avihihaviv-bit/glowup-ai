"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  CalendarCheck,
  ScanFace,
  Scissors,
  Droplets,
  Dumbbell,
  Shirt,
  MessageCircleHeart,
  TrendingUp,
  Settings,
  MoreHorizontal,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import { useStore, computeXP } from "@/lib/store";
import { levelFor } from "@/lib/plan";
import { useAIStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar } from "./StoredImage";
import { Modal } from "./ui";

export const NAV = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/plan", label: "תוכנית 30 יום", icon: CalendarCheck },
  { href: "/face", label: "ניתוח פנים", icon: ScanFace },
  { href: "/hair", label: "שיער ותספורות", icon: Scissors },
  { href: "/skin", label: "טיפוח עור", icon: Droplets },
  { href: "/fitness", label: "גוף וכושר", icon: Dumbbell },
  { href: "/style", label: "סטייל", icon: Shirt },
  { href: "/coach", label: "מאמן AI", icon: MessageCircleHeart },
  { href: "/progress", label: "התקדמות", icon: TrendingUp },
  { href: "/settings", label: "הגדרות ופרטיות", icon: Settings },
];

const MOBILE = ["/", "/plan", "/coach", "/progress"];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const profile = useStore((s) => s.profile);
  const theme = useStore((s) => s.theme);
  const router = useRouter();
  const path = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (mounted && !profile) router.replace("/onboarding");
  }, [mounted, profile, router]);

  if (!mounted || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex items-center gap-2 text-muted">
          <Sparkles className="size-5 animate-pulse text-accent" /> טוען…
        </div>
      </div>
    );
  }

  return (
    <div className="glow-bg min-h-dvh">
      <Sidebar path={path} />
      <main className="lg:pr-72">
        <TopBar />
        <AnimatePresence mode="wait">
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav path={path} />
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-green text-black">
        <Sparkles className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-wide" dir="ltr">
          GLOWUP <span className="text-gradient">AI</span>
        </div>
        <div className="text-[11px] text-dim">המאמן האישי שלך</div>
      </div>
    </Link>
  );
}

function AIBadge() {
  const { aiEnabled, loading } = useAIStatus();
  if (loading) return null;
  return aiEnabled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-medium text-green">
      <span className="size-1.5 rounded-full bg-green" /> AI מחובר
    </span>
  ) : (
    <Link href="/settings" className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn">
      <FlaskConical className="size-3" /> מצב דמו
    </Link>
  );
}

function Sidebar({ path }: { path: string }) {
  const profile = useStore((s) => s.profile)!;
  const state = useStore();
  const lvl = levelFor(computeXP(state));
  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 flex-col border-l border-line bg-elev/80 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="flex items-center justify-between px-2">
        <Logo />
        <AIBadge />
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV.map((n) => {
          const active = isActive(path, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {active && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl border border-line bg-surface-2" />}
              <n.icon className={cn("relative size-[18px]", active && "text-accent")} />
              <span className="relative">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/progress" className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-line-strong">
        <Avatar imageId={profile.avatarImageId} name={profile.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{profile.name}</div>
          <div className="text-xs text-muted">
            רמה {lvl.level} · {lvl.name}
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-gradient-to-l from-accent to-green" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
        </div>
      </Link>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Logo />
      <AIBadge />
    </div>
  );
}

function BottomNav({ path }: { path: string }) {
  const [more, setMore] = useState(false);
  const items = NAV.filter((n) => MOBILE.includes(n.href));
  const moreActive = !MOBILE.some((m) => isActive(path, m) && (m !== "/" || path === "/"));
  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-elev/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "text-accent" : "text-muted")}>
                <n.icon className="size-5" />
                {n.label.replace(" 30 יום", "")}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", moreActive ? "text-accent" : "text-muted")}>
            <MoreHorizontal className="size-5" />
            עוד
          </button>
        </div>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="כל האזורים">
        <div className="grid grid-cols-3 gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMore(false)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-3 text-center text-xs",
                isActive(path, n.href) && "border-accent text-accent",
              )}
            >
              <n.icon className="size-6" />
              {n.label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
