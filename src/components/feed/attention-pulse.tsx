"use client";

import type { CompulsionLevel, CompulsionReading } from "@/lib/telemetry/compulsion";
import type { ViewEvent } from "@/types";
import { cn } from "@/lib/utils";

export const levelStyle: Record<CompulsionLevel, { label: string; color: string; note: string }> = {
  calm: { label: "Calm", color: "hsl(160 60% 58%)", note: "You are in control of this scroll." },
  drifting: { label: "Drifting", color: "hsl(38 92% 62%)", note: "Attention is starting to slip." },
  compulsive: { label: "Compulsive", color: "hsl(350 90% 64%)", note: "This looks like autopilot scrolling." }
};

/** Attention "EKG": one point per reel, height = how long you stayed (flatline = rapid-fire swiping). */
function pulsePath(views: ViewEvent[], width: number, height: number) {
  const points = views.slice(-24);
  if (points.length < 2) return `M0 ${height / 2} L${width} ${height / 2}`;
  const stepX = width / (points.length - 1);
  return points
    .map((view, i) => {
      const dwell = Math.min(20, view.dwellMs / 1000);
      const y = height - 4 - (dwell / 20) * (height - 8);
      return `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function AttentionPulse({
  reading,
  views,
  className
}: {
  reading: CompulsionReading;
  views: ViewEvent[];
  className?: string;
}) {
  const style = levelStyle[reading.level];
  const circumference = 2 * Math.PI * 42;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Compulsion index ${reading.index} out of 100, ${style.label}`}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={style.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - reading.index / 100)}
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1), stroke 400ms" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-2xl font-medium tabular-nums" style={{ color: style.color }}>
              {reading.index}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Compulsion index</div>
          <div className="font-display text-xl font-medium tracking-tight" style={{ color: style.color }}>
            {style.label}
          </div>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{style.note}</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
          <span>Attention pulse</span>
          <span>last {Math.min(24, views.length)} reels</span>
        </div>
        <svg viewBox="0 0 240 56" className="h-14 w-full" role="img" aria-label="Hold time per reel over time">
          <line x1="0" y1="28" x2="240" y2="28" stroke="hsl(var(--foreground) / 0.08)" strokeDasharray="3 4" />
          <path
            d={pulsePath(views, 240, 56)}
            fill="none"
            stroke={style.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${style.color})`, transition: "stroke 400ms" }}
          />
        </svg>
      </div>

      <ul className="space-y-2">
        {reading.components
          .filter((component) => component.key !== "lateNight" || component.value > 0)
          .map((component) => (
            <li key={component.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/85">{component.label}</span>
                <span className="tabular-nums text-muted-foreground">+{component.contribution}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                <div
                  className="h-full w-full origin-left rounded-full"
                  style={{
                    transform: `scaleX(${Math.max(0.02, component.value)})`,
                    background: style.color,
                    transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)"
                  }}
                />
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

export function PulsePill({ reading, className }: { reading: CompulsionReading; className?: string }) {
  const style = levelStyle[reading.level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md",
        className
      )}
      role="status"
      aria-label={`Compulsion index ${reading.index}, ${style.label}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: style.color }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: style.color }} />
      </span>
      <span className="tabular-nums">{reading.index}</span>
      <span className="text-white/70">{style.label}</span>
    </span>
  );
}
