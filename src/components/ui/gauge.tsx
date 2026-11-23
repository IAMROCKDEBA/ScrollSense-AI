"use client";

import { useId } from "react";
import { m } from "framer-motion";
import { clamp, cn } from "@/lib/utils";
import { ease } from "@/lib/motion";
import { CountUp } from "@/components/ui/count-up";

export type GaugeTone = "rose" | "jade" | "amber" | "coral" | "danger" | "orchid";

interface GaugeProps {
  value: number;
  label: string;
  tone?: GaugeTone;
  size?: number;
  className?: string;
}

const tones: Record<GaugeTone, [string, string]> = {
  rose: ["var(--metal-1)", "var(--metal-3)"],
  jade: ["hsl(var(--success) / 0.75)", "hsl(var(--success))"],
  amber: ["hsl(var(--accent))", "hsl(var(--warning))"],
  coral: ["hsl(var(--warning))", "hsl(var(--danger))"],
  danger: ["hsl(var(--danger) / 0.8)", "hsl(var(--danger))"],
  orchid: ["hsl(var(--secondary))", "hsl(var(--accent))"]
};

/** Maps an addiction-risk score (0-100, higher is worse) to a gauge tone. */
export function toneForRisk(score: number): GaugeTone {
  if (score > 75) return "danger";
  if (score > 50) return "coral";
  if (score > 25) return "amber";
  return "jade";
}

/** Stroke-drawn gradient ring with count-up numeral. Replaces the old flat ProgressRing. */
export function Gauge({ value, label, tone = "rose", size = 148, className }: GaugeProps) {
  const id = useId().replace(/:/g, "");
  const safe = clamp(value);
  const [from, to] = tones[tone];
  const radius = 62;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        role="img"
        aria-label={`${label}: ${Math.round(safe)} out of 100`}
        className="-rotate-90 overflow-visible"
      >
        <defs>
          <linearGradient id={`g-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: from }} />
            <stop offset="100%" style={{ stopColor: to }} />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="75" fill="none" stroke="hsl(var(--foreground) / 0.18)" strokeWidth="1.5" strokeDasharray="1 6.2" strokeLinecap="round" />
        <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="11" />
        <m.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth="22"
          strokeLinecap="round"
          opacity={0.16}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: safe / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: ease.out }}
        />
        <m.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth="11"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: safe / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: ease.out }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display font-medium leading-none tracking-tight" style={{ fontSize: size * 0.3 }}>
            <CountUp value={safe} duration={1.4} />
          </div>
          <span className="mt-1 block max-w-[5.5rem] text-[0.6875rem] font-medium uppercase leading-tight tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
