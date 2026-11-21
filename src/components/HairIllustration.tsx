import type { Hairstyle } from "@/lib/knowledge";

/** Minimal stylized illustration per hairstyle silhouette (inspiration, not a photo). */
export function HairIllustration({ style }: { style: Hairstyle }) {
  const hair = `hsl(${style.hue} 45% 62%)`;
  const hairDark = `hsl(${style.hue} 35% 40%)`;
  const shapes: Record<Hairstyle["shape"], React.ReactNode> = {
    buzz: <path d="M30 44c0-14 9-22 20-22s20 8 20 22c-3-6-10-10-20-10s-17 4-20 10z" fill={hair} opacity={0.7} />,
    crop: <path d="M28 46c-1-17 9-26 22-26s23 9 22 26c-2-4-4-6-7-7-6 3-22 4-30 0-3 1-5 4-7 7z" fill={hair} />,
    quiff: <path d="M28 48c-2-16 4-24 12-27 4-6 16-8 24-2 8 6 9 18 8 29-2-5-5-8-9-9-8-6-24-5-28 0-3 2-5 5-7 9z" fill={hair} />,
    side: <path d="M28 48c-2-17 8-27 22-27 15 0 24 10 22 27-3-7-8-10-14-12l-4-6-6 6c-8 1-15 4-20 12z" fill={hair} />,
    fringe: <path d="M27 54c-3-20 7-33 23-33s26 13 23 33c-1-6-3-10-6-12-4 4-30 4-34 0-3 2-5 6-6 12z" fill={hair} />,
    curly: (
      <g fill={hair}>
        {[30, 38, 46, 54, 62, 70, 34, 42, 50, 58, 66].map((x, i) => (
          <circle key={i} cx={x} cy={i < 6 ? 30 : 23} r={7} />
        ))}
        <path d="M28 44c0-8 4-12 8-14h28c4 2 8 6 8 14-4-4-12-6-22-6s-18 2-22 6z" />
      </g>
    ),
    bob: <path d="M24 70c-4-30 6-49 26-49s30 19 26 49c-4 0-8-1-10-3 2-10 1-20-3-26-6 2-20 2-26 0-4 6-5 16-3 26-2 2-6 3-10 3z" fill={hair} />,
    lob: <path d="M23 80c-5-36 5-59 27-59s32 23 27 59c-4 0-8-1-11-3 2-14 1-26-3-34-6 2-20 2-26 0-4 8-5 20-3 34-3 2-7 3-11 3z" fill={hair} />,
    long: <path d="M24 78c-6-34 4-57 26-57s32 23 26 57c-3-1-6-3-8-5 1-14 0-26-4-32-6-2-22-2-28 0-4 6-5 18-4 32-2 2-5 4-8 5z" fill={hair} />,
    layers: (
      <g fill={hair}>
        <path d="M22 92c-8-42 4-71 28-71s36 29 28 71c-4-2-7-5-9-9 2-20 0-34-5-42-6 2-22 2-28 0-5 8-7 22-5 42-2 4-5 7-9 9z" />
        <path d="M30 60c2 8 3 16 2 24M70 60c-2 8-3 16-2 24" stroke={hairDark} strokeWidth={1.5} fill="none" />
      </g>
    ),
    bun: (
      <g fill={hair}>
        <circle cx={50} cy={14} r={10} />
        <path d="M29 46c-1-16 8-25 21-25s22 9 21 25c-4-6-11-9-21-9s-17 3-21 9z" />
      </g>
    ),
    mullet: <path d="M28 46c-1-16 9-25 22-25s23 9 22 25c-1 6 0 14 2 22-4 2-8 2-11 0 1-8 0-14-2-18-5 1-17 1-22 0-2 4-3 10-2 18-3 2-7 2-11 0 2-8 3-16 2-22z" fill={hair} />,
  };
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <defs>
        <radialGradient id={`bg-${style.id}`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor={`hsl(${style.hue} 60% 30% / 0.35)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg-${style.id})`} />
      <path d="M38 78c0 8-12 10-16 22h56c-4-12-16-14-16-22z" fill="var(--surface-3)" />
      <ellipse cx="50" cy="50" rx="19" ry="24" fill="var(--border-strong)" />
      {shapes[style.shape]}
    </svg>
  );
}
