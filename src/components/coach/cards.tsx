"use client";

import { m } from "framer-motion";
import { ArrowRight, Brain, Gauge as GaugeIcon, Heart, TrendingDown, TrendingUp } from "lucide-react";
import type { CoachCard } from "@/lib/ai/events";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const toneFor = (score: number) => (score <= 25 ? "hsl(160 60% 58%)" : score <= 50 ? "hsl(38 92% 62%)" : score <= 75 ? "hsl(24 92% 62%)" : "hsl(350 90% 64%)");

function ScoreRing({ value, size = 76, color }: { value: number; size?: number; color: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="8" />
        <m.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-xl font-medium tabular-nums">{value}</div>
    </div>
  );
}

function CardShell({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.soft}
      className={cn("rounded-2xl border border-foreground/10 bg-foreground/[0.04] p-4", className)}
    >
      <div className="mb-3 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </m.div>
  );
}

export function CoachCardView({ card }: { card: CoachCard }) {
  switch (card.type) {
    case "risk":
      return (
        <CardShell icon={<GaugeIcon className="h-3.5 w-3.5" aria-hidden="true" />} title="Your risk score">
          <div className="flex items-center gap-4">
            <ScoreRing value={card.score} color={toneFor(card.score)} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="font-display text-lg font-medium" style={{ color: toneFor(card.score) }}>
                {card.category}
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence {card.confidence}% · Well-being {card.wellbeing} · Impulse control {card.impulse}
                {card.focus !== null ? ` · Focus ${card.focus}` : ""}
              </div>
              {card.trend ? <div className="text-xs text-muted-foreground">Trend: {card.trend}</div> : null}
            </div>
          </div>
          {card.topFactors.length ? (
            <ul className="mt-3 space-y-1 text-xs text-foreground/85">
              {card.topFactors.map((factor) => (
                <li key={factor} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {factor}
                </li>
              ))}
            </ul>
          ) : null}
        </CardShell>
      );

    case "what_if": {
      const better = card.delta < 0;
      return (
        <CardShell icon={better ? <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />} title="What-if simulation">
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <div className="text-center">
              <ScoreRing value={card.before.score} size={72} color={toneFor(card.before.score)} />
              <div className="mt-1 text-[0.6875rem] text-muted-foreground">Now · {card.before.category}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", better ? "bg-[hsl(160_60%_58%/0.15)] text-[hsl(160_60%_62%)]" : "bg-[hsl(350_90%_64%/0.15)] text-[hsl(350_90%_70%)]")}>
                {card.delta > 0 ? "+" : ""}
                {card.delta}
              </span>
            </div>
            <div className="text-center">
              <ScoreRing value={card.after.score} size={72} color={toneFor(card.after.score)} />
              <div className="mt-1 text-[0.6875rem] text-muted-foreground">If changed · {card.after.category}</div>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {card.changes.map((change) => (
              <li key={change.label} className="flex items-center justify-between gap-2 rounded-lg bg-foreground/[0.04] px-2.5 py-1.5">
                <span className="text-muted-foreground">{change.label}</span>
                <span className="tabular-nums">
                  {change.from} → <strong className="font-semibold">{change.to}</strong>
                </span>
              </li>
            ))}
          </ul>
          {card.factorDeltas.length ? (
            <div className="mt-2 text-[0.6875rem] text-muted-foreground">
              Biggest movers: {card.factorDeltas.slice(0, 3).map((item) => `${item.label} ${item.delta > 0 ? "+" : ""}${item.delta}`).join(" · ")}
            </div>
          ) : null}
        </CardShell>
      );
    }

    case "sessions": {
      const maxMin = Math.max(1, ...card.rows.map((row) => row.minutes));
      return (
        <CardShell icon={<GaugeIcon className="h-3.5 w-3.5" aria-hidden="true" />} title="Recent sessions">
          {card.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">No completed sessions yet.</p>
          ) : (
            <ul className="space-y-2">
              {card.rows.map((row) => (
                <li key={row.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{row.when}</span>
                    <span className="tabular-nums">
                      {row.minutes} min · {row.videos} reels · {row.skipPct}% skipped · urge {row.urge}
                      {row.peak !== undefined ? ` · peak ${row.peak}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                    <div className="h-full origin-left rounded-full bg-metal" style={{ transform: `scaleX(${row.minutes / maxMin})`, width: "100%" }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardShell>
      );
    }

    case "mood":
      return (
        <CardShell icon={<Heart className="h-3.5 w-3.5" aria-hidden="true" />} title="Mood before → after">
          <ul className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
            {card.points.map((point, index) => (
              <li key={index} className="rounded-lg bg-foreground/[0.04] px-2 py-1.5">
                <div className="text-[0.625rem] text-muted-foreground">{point.label}</div>
                <div>
                  {point.before} → <strong className="font-semibold">{point.after}</strong>
                </div>
              </li>
            ))}
          </ul>
        </CardShell>
      );

    case "cognitive":
      return (
        <CardShell icon={<Brain className="h-3.5 w-3.5" aria-hidden="true" />} title="Brain tests">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Metric label="Reaction" value={card.reactionMs === undefined ? "–" : `${Math.round(card.reactionMs)} ms`} />
            <Metric label="Memory" value={card.memory === undefined ? "–" : `${Math.round(card.memory)}/100`} />
            <Metric label="Stroop" value={card.stroop === undefined ? "–" : `${Math.round(card.stroop)}/100`} />
          </div>
        </CardShell>
      );

    case "breakdown":
      return null;
    default:
      return null;
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-foreground/[0.04] px-2 py-2.5">
      <div className="font-display text-base font-medium tabular-nums">{value}</div>
      <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
    </div>
  );
}
