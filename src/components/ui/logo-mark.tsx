import { useId } from "react";
import { cn } from "@/lib/utils";

/** Brand mark: a rose-gold orb crowned by the three-bar "feed" motif. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={cn("shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`lm-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--metal-1)" }} />
          <stop offset="55%" style={{ stopColor: "var(--metal-2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--metal-3)" }} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="15" fill="hsl(var(--card))" stroke={`url(#lm-${id})`} strokeWidth="1.5" />
      <ellipse cx="24" cy="28" rx="13" ry="12.5" fill={`url(#lm-${id})`} />
      <ellipse cx="19.5" cy="22.5" rx="5.5" ry="3" fill="#fff" opacity="0.35" transform="rotate(-24 19.5 22.5)" />
      {[
        { x: 17.5, y: 10, h: 7 },
        { x: 22, y: 7, h: 10 },
        { x: 26.5, y: 10, h: 7 }
      ].map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={b.y}
          width="3"
          height={b.h}
          rx="1.5"
          fill={`url(#lm-${id})`}
          className="origin-bottom animate-[tuft_2.6s_ease-in-out_infinite] [transform-box:fill-box]"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
      <circle cx="20.5" cy="28" r="1.7" fill="#2A0F20" />
      <circle cx="27.5" cy="28" r="1.7" fill="#2A0F20" />
      <path d="M21.5 32.5 Q24 34.8 26.5 32.5" fill="none" stroke="#2A0F20" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
