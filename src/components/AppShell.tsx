"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  FlaskConical,
  HeartHandshake,
  Bell,
  Flame,
  ChevronsLeft,
  ChevronsRight,
  Brush,
  Smile,
  SprayCan,
  Waves,
  Library,
  type LucideIcon,
} from "lucide-react";
import { useStore, computeXP, computeStreak } from "@/lib/store";
import { levelFor } from "@/lib/plan";
import { useAIStatus } from "@/lib/api";
import { useLang, useT } from "@/lib/i18n";
import { cn, dateKey } from "@/lib/utils";
import { Avatar } from "./StoredImage";
import { Modal } from "./ui";

type NavItem = { href: string; key: string; short?: string; icon: LucideIcon };

export const NAV_GROUPS: { key: string; items: NavItem[] }[] = [
  {
    key: "nav.group.main",
    items: [
      { href: "/", key: "nav.home", icon: LayoutDashboard },
      { href: "/concerns", key: "nav.concerns", icon: HeartHandshake },
      { href: "/coach", key: "nav.coach", icon: MessageCircleHeart },
      { href: "/plan", key: "nav.plan", short: "nav.planShort", icon: CalendarCheck },
    ],
  },
  {
    key: "nav.group.analysis",
    items: [
      { href: "/face", key: "nav.face", short: "nav.scan", icon: ScanFace },
      { href: "/skin", key: "nav.skin", icon: Droplets },
      { href: "/hair", key: "nav.hair", icon: Scissors },
      { href: "/style", key: "nav.style", icon: Shirt },
      { href: "/fitness", key: "nav.fitness", icon: Dumbbell },
    ],
  },
  {
    key: "nav.group.care",
    items: [
      { href: "/grooming", key: "nav.grooming", icon: Brush },
      { href: "/oral", key: "nav.oral", icon: Smile },
      { href: "/fragrance", key: "nav.fragrance", icon: SprayCan },
      { href: "/debloat", key: "nav.debloat", icon: Waves },
      { href: "/tips", key: "nav.tips", icon: Library },
    ],
  },
  {
    key: "nav.group.track",
    items: [
      { href: "/progress", key: "nav.progress", icon: TrendingUp },
      { href: "/settings", key: "nav.settings", icon: Settings },
    ],
  },
];
const ALL = NAV_GROUPS.flatMap((g) => g.items);
const MOBILE = ["/", "/face", "/concerns", "/coach"];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const profile = useStore((s) => s.profile);
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const router = useRouter();
  const path = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !profile) router.replace("/onboarding");
  }, [mounted, profile, router]);

  if (!mounted || !profile) {
    return (
      <div className="glow-bg grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <LogoMark size={52} />
          </div>
          <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glow-bg min-h-dvh">
      <Sidebar path={path} />
      <main className={cn("transition-[padding] duration-300", collapsed ? "lg:ps-[88px]" : "lg:ps-72")}>
        <TopBar />
        <motion.div
          key={path}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8"
        >
          {children}
        </motion.div>
      </main>
      <BottomNav path={path} />
    </div>
  );
}

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#49b6f5] via-accent to-accent-strong text-white shadow-[0_8px_20px_-8px_var(--accent)]"
      style={{ width: size, height: size }}
    >
      <ScanFace className="size-[55%]" />
    </div>
  );
}

function Logo({ compact }: { compact?: boolean }) {
  const t = useT();
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-wide text-fg" dir="ltr">
            GLOWUP <span className="text-gradient">AI</span>
          </div>
          <div className="text-[11px] text-dim">{t("nav.tagline")}</div>
        </div>
      )}
    </Link>
  );
}

function AIBadge() {
  const t = useT();
  const { aiEnabled, loading } = useAIStatus();
  // reserve the badge's space while loading so the header doesn't shift
  if (loading) return <span className="inline-block h-5 w-[72px] rounded-full bg-surface-2" aria-hidden />;
  return aiEnabled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-medium text-green">
      <span className="size-1.5 rounded-full bg-green" /> {t("common.aiOn")}
    </span>
  ) : (
    <Link href="/settings" className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn">
      <FlaskConical className="size-3" /> {t("common.demo")}
    </Link>
  );
}

function Sidebar({ path }: { path: string }) {
  const t = useT();
  const lang = useLang();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const setCollapsed = useStore((s) => s.setSidebarCollapsed);
  const profile = useStore((s) => s.profile)!;
  const state = useStore();
  const lvl = levelFor(computeXP(state));
  // the chevron points toward the side the panel collapses to
  const CollapseIcon = (lang === "he") !== collapsed ? ChevronsRight : ChevronsLeft;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-line bg-white/80 py-5 backdrop-blur-xl transition-[width] duration-300 lg:flex",
        collapsed ? "w-[88px] px-3" : "w-72 px-4",
      )}
    >
      <div className={cn("flex items-center px-1", collapsed ? "justify-center" : "justify-between")}>
        <Logo compact={collapsed} />
        {!collapsed && <AIBadge />}
      </div>
      <nav className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV_GROUPS.map((g) => (
          <div key={g.key}>
            {!collapsed && <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-dim">{t(g.key)}</div>}
            <div className="flex flex-col gap-0.5">
              {g.items.map((n) => {
                const active = isActive(path, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    title={collapsed ? t(n.key) : undefined}
                    aria-label={collapsed ? t(n.key) : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition",
                      collapsed && "justify-center px-0",
                      active ? "text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    {active && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl bg-accent-soft" />}
                    <n.icon className="relative size-[19px] shrink-0" />
                    {!collapsed && <span className="relative font-medium">{t(n.key)}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn("mb-3 flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs text-dim hover:bg-surface-2 hover:text-fg", collapsed && "justify-center px-0")}
        aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
      >
        <CollapseIcon className="size-4" />
        {!collapsed && t("nav.collapse")}
      </button>
      <Link
        href="/progress"
        className={cn("flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:border-line-strong", collapsed && "justify-center p-2")}
      >
        <Avatar imageId={profile.avatarImageId} name={profile.name} size={collapsed ? 36 : 40} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
            <div className="text-xs text-muted">
              {t("top.level")} {lvl.level} · {lvl.name}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-gradient-to-l from-accent to-cyan" style={{ width: `${lvl.progress * 100}%` }} />
            </div>
          </div>
        )}
      </Link>
    </aside>
  );
}

function useNotifications() {
  const t = useT();
  const { aiEnabled, loading } = useAIStatus();
  const checkins = useStore((s) => s.checkins);
  const concerns = useStore((s) => s.concerns);
  const scans = useStore((s) => s.scans);
  const plan = useStore((s) => s.plan);
  return useMemo(() => {
    const out: { id: string; text: string; href: string }[] = [];
    if (!checkins[dateKey()]) out.push({ id: "checkin", text: t("notif.checkin"), href: "/" });
    if (concerns.some((c) => !c.analysis)) out.push({ id: "concern", text: t("notif.concern"), href: "/concerns" });
    if (!scans.length) out.push({ id: "scan", text: t("notif.scan"), href: "/face" });
    if (!plan) out.push({ id: "plan", text: t("notif.plan"), href: "/plan" });
    if (!loading && !aiEnabled) out.push({ id: "demo", text: t("notif.demo"), href: "/settings" });
    return out;
  }, [t, checkins, concerns, scans, plan, aiEnabled, loading]);
}

function NotificationBell() {
  const t = useT();
  const items = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full border border-line bg-white text-muted shadow-sm hover:text-fg"
        aria-label={`${t("top.notifications")} (${items.length})`}
        aria-expanded={open}
      >
        <Bell className="size-[18px]" />
        {items.length > 0 && <span className="absolute -end-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">{items.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute end-0 top-12 z-40 w-72 rounded-2xl border border-line bg-white p-2 shadow-lift"
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-dim">{t("top.notifications")}</div>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted">{t("top.noNotifications")}</p>
            ) : (
              items.map((n) => (
                <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm hover:bg-surface-2">
                  <span className="size-2 shrink-0 rounded-full bg-accent" />
                  {n.text}
                </Link>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopBar() {
  const t = useT();
  const lang = useLang();
  const state = useStore();
  const profile = state.profile!;
  const streak = computeStreak(state);
  const lvl = levelFor(computeXP(state));
  const today = new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 lg:hidden">
          <Logo compact />
          <AIBadge />
        </div>
        <div className="hidden text-sm text-muted lg:block">{today}</div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-fg shadow-sm sm:inline-flex" title={t("top.streak")}>
            <Flame className="size-3.5 text-warn" /> {streak.current}
          </span>
          <span className="hidden items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong sm:inline-flex">
            {t("top.level")} {lvl.level}
          </span>
          <NotificationBell />
          <Link href="/settings" className="hidden sm:block" aria-label={t("nav.settings")}>
            <Avatar imageId={profile.avatarImageId} name={profile.name} size={38} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ path }: { path: string }) {
  const t = useT();
  const [more, setMore] = useState(false);
  const items = MOBILE.map((h) => ALL.find((n) => n.href === h)!);
  const moreActive = !MOBILE.some((m) => isActive(path, m));
  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-accent" : "text-dim")}>
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-accent-soft")}>
                  <n.icon className="size-5" />
                </span>
                {t(n.short ?? n.key)}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium", moreActive ? "text-accent" : "text-dim")}>
            <span className={cn("grid h-7 w-12 place-items-center rounded-full", moreActive && "bg-accent-soft")}>
              <MoreHorizontal className="size-5" />
            </span>
            {t("nav.more")}
          </button>
        </div>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title={t("nav.allAreas")}>
        <div className="space-y-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.key}>
              <div className="mb-2 text-xs font-semibold text-dim">{t(g.key)}</div>
              <div className="grid grid-cols-3 gap-2">
                {g.items.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMore(false)}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white p-3 text-center text-xs shadow-sm",
                      isActive(path, n.href) && "border-accent bg-accent-soft text-accent-strong",
                    )}
                  >
                    <n.icon className="size-6" />
                    {t(n.key)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
