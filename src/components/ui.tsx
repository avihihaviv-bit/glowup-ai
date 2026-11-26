"use client";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X, FlaskConical, Sparkles } from "lucide-react";
import { forwardRef, isValidElement, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  interactive,
  ...rest
}: { className?: string; children: ReactNode; interactive?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-line bg-surface p-5 shadow-card backdrop-blur-xl",
        interactive && "transition hover:-translate-y-0.5 hover:border-line-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "green";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode }
>(function Button({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        size === "sm" && "h-10 px-3.5 text-sm sm:h-9",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" &&
          "bg-gradient-to-l from-accent-strong to-accent text-white shadow-[0_8px_30px_-10px_var(--accent-strong)] hover:brightness-110",
        variant === "secondary" && "border border-line bg-white text-fg shadow-sm hover:bg-surface-2",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        variant === "danger" && "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
        variant === "green" && "bg-green text-white hover:brightness-105",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "accent" | "green" | "warn" | "danger"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "default" && "bg-surface-2 text-muted",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "green" && "bg-green-soft text-green",
        tone === "warn" && "bg-warn-bg text-warn",
        tone === "danger" && "bg-danger/10 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, color = "accent", className }: { value: number; color?: "accent" | "green"; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <motion.div
        className={cn("h-full rounded-full", color === "accent" ? "bg-gradient-to-l from-accent-strong to-accent" : "bg-green")}
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function Ring({ value, size = 140, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">{icon}</div>
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#172b4d]/35 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "pb-safe relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-elev p-5 pb-8 shadow-2xl sm:rounded-3xl sm:p-6",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg" aria-label="סגירה">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-10 rounded-full border px-3.5 py-2 text-sm transition sm:min-h-0 sm:py-1.5",
        active ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  // Use a <label> only around a single native form control; groups of buttons get role="group".
  const isControl =
    isValidElement(children) &&
    (children.type === Input || children.type === Select || children.type === Textarea || children.type === "input" || children.type === "select");
  const Wrapper = isControl ? "label" : "div";
  return (
    <Wrapper className="block" {...(!isControl && { role: "group", "aria-label": label })}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dim">{hint}</span>}
    </Wrapper>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-fg sm:text-sm placeholder:text-dim outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputCls, "h-11", className)} {...rest} />;
});

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "min-h-24 resize-none", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, "h-11", className)} {...rest}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex w-full max-w-full rounded-xl border border-line bg-surface-2 p-1 sm:w-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "relative min-h-10 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-sm leading-tight transition sm:min-h-0 sm:flex-none sm:whitespace-nowrap sm:px-3",
            value === o.value ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-lg bg-surface-3" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Clear, honest labeling of where a result came from. */
export function SourceNotice({ source, className, fallback }: { source: "ai" | "demo"; className?: string; fallback?: string }) {
  if (source === "ai") {
    return (
      <div className={cn("flex items-start gap-2 rounded-xl border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-sm text-accent", className)}>
        <Sparkles className="mt-0.5 size-4 shrink-0" />
        <span>נוצר על ידי AI על סמך המידע שסיפקת. אלו המלצות כלליות לטיפוח וסטייל, לא ייעוץ רפואי.</span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-sm text-warn", className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      {fallback ? (
        <span>
          <b>ה-AI לא היה זמין כרגע</b> ({fallback}), אז מוצגת תוצאה מבוססת כללים: היא מבוססת על הבחירות שלך ועל מאגר ידע, ולא על ניתוח התמונה. אפשר לנסות שוב בעוד כמה דקות.
        </span>
      ) : (
        <span>
          <b>מצב דמו</b>: התוצאה <u>לא</u> נוצרה על ידי AI ואינה מבוססת על ניתוח התמונה שלך. היא מבוססת על הבחירות שלך ועל מאגר ידע כללי. איכות התמונה (תאורה וחדות) נמדדת מקומית בדפדפן.
        </span>
      )}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-muted">
      <Loader2 className="size-5 animate-spin text-accent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Stat({ label, value, sub, icon, accent }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: "accent" | "green" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs sm:text-sm">{label}</span>
        {icon && <span className={cn(accent === "green" ? "text-green" : "text-accent")}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-dim">{sub}</div>}
    </Card>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="danger" onClick={onRetry}>
          נסו שוב
        </Button>
      )}
    </div>
  );
}
