"use client";

import { m } from "framer-motion";
import type { ViewEvent } from "@/types";
import { cn } from "@/lib/utils";

interface Bar {
  dwell: number;
  liked: boolean;
  looped: boolean;
  label: string;
}

const COLORS = {
  skip: "hsl(350 85% 64%)",
  glance: "hsl(38 92% 62%)",
  held: "hsl(160 60% 58%)"
} as const;

function colorFor(dwellSec: number) {
  return dwellSec < 3 ? COLORS.skip : dwellSec < 8 ? COLORS.glance : COLORS.held;
}

function toBars(views: Pick<ViewEvent, "dwellMs" | "liked" | "loops" | "title">[], max = 72): Bar[] {
  const bars: Bar[] = views.map((view, i) => ({
    dwell: view.dwellMs / 1000,
    liked: view.liked,
    looped: view.loops > 0,
    label: `#${i + 1} ${view.title.slice(0, 40)} · ${(view.dwellMs / 1000).toFixed(1)}s`
  }));
  if (bars.length <= max) return bars;
  // Very long sessions: bucket into `max` bars (mean hold time) so the chart stays readable.
  const size = Math.ceil(bars.length / max);
  const out: Bar[] = [];
  for (let i = 0; i < bars.length; i += size) {
    const chunk = bars.slice(i, i + size);
    const mean = chunk.reduce((sum, bar) => sum + bar.dwell, 0) / chunk.length;
    out.push({ dwell: mean, liked: chunk.some((bar) => bar.liked), looped: chunk.some((bar) => bar.looped), label: `Reels ${i + 1}-${i + chunk.length} · avg ${mean.toFixed(1)}s` });
  }
  return out;
}

/**
 * Per-reel attention timeline: bar height = how long you stayed, colour = skim / glance / held.
 * The white line is a rolling average, so decaying attention is visible at a glance.
 */
export function AttentionTimeline({ views, className }: { views: Pick<ViewEvent, "dwellMs" | "liked" | "loops" | "title">[]; className?: string }) {
  const bars = toBars(views);
  if (bars.length === 0) return null;

  const W = 640;
  const H = 150;
  const padX = 8;
  const top = 12;
  const base = H - 20;
  const cap = Math.max(20, ...bars.map((bar) => Math.min(30, bar.dwell)));
  const slot = (W - padX * 2) / bars.length;
  const barW = Math.max(2, slot * 0.66);
  const yFor = (dwell: number) => base - (Math.min(cap, dwell) / cap) * (base - top);

  const rolling = bars.map((_, i) => {
    const window = bars.slice(Math.max(0, i - 3), i + 1);
    return window.reduce((sum, bar) => sum + Math.min(cap, bar.dwell), 0) / window.length;
  });
  const line = rolling.map((value, i) => `${i === 0 ? "M" : "L"}${(padX + slot * i + slot / 2).toFixed(1)} ${yFor(value).toFixed(1)}`).join(" ");

  return (
    <figure className={cn("space-y-2", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`Attention timeline across ${views.length} reels. Taller bars mean you stayed longer.`}>
        {[3, 8].map((threshold) => (
          <g key={threshold}>
            <line x1={padX} x2={W - padX} y1={yFor(threshold)} y2={yFor(threshold)} stroke="hsl(var(--foreground) / 0.12)" strokeDasharray="3 5" />
            <text x={W - padX} y={yFor(threshold) - 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">
              {threshold}s
            </text>
          </g>
        ))}
        {bars.map((bar, i) => {
          const y = yFor(Math.max(0.6, bar.dwell));
          const x = padX + slot * i + (slot - barW) / 2;
          return (
            <g key={i}>
              <m.rect
                x={x}
                width={barW}
                rx={Math.min(3, barW / 2)}
                fill={colorFor(bar.dwell)}
                initial={{ y: base, height: 0, opacity: 0 }}
                animate={{ y, height: base - y, opacity: 1 }}
                transition={{ delay: Math.min(0.9, i * 0.012), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <title>{bar.label}</title>
              </m.rect>
              {bar.liked ? <circle cx={x + barW / 2} cy={H - 8} r="2.6" fill="hsl(350 90% 64%)" /> : null}
              {bar.looped ? <circle cx={x + barW / 2} cy={H - 8} r="2.6" fill="none" stroke="hsl(190 70% 62%)" strokeWidth="1.2" /> : null}
            </g>
          );
        })}
        <m.path
          d={line}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.85"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-muted-foreground">
        <Legend color={COLORS.skip} label="Skipped (< 3 s)" />
        <Legend color={COLORS.glance} label="Glanced (3-8 s)" />
        <Legend color={COLORS.held} label="Held (8 s +)" />
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-foreground/80" aria-hidden="true" /> rolling average
        </span>
      </figcaption>
    </figure>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
