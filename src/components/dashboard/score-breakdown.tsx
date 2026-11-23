"use client";

import type { RiskFactor, RiskFactorGroup } from "@/types";
import { cn } from "@/lib/utils";

const groupStyle: Record<RiskFactorGroup, { label: string; color: string }> = {
  "self-report": { label: "Self-report", color: "hsl(300 55% 72%)" },
  behaviour: { label: "Feed behaviour", color: "hsl(350 85% 70%)" },
  cognitive: { label: "Brain tests", color: "hsl(190 70% 62%)" },
  lifestyle: { label: "Lifestyle", color: "hsl(38 90% 66%)" }
};

/** Shows exactly how many points each measured factor adds to the risk score (the model is fully transparent). */
export function ScoreBreakdown({ breakdown, className }: { breakdown: RiskFactor[]; className?: string }) {
  const measured = breakdown.filter((factor) => factor.score !== null).sort((a, b) => b.contribution - a.contribution);
  const unmeasured = breakdown.filter((factor) => factor.score === null);
  const max = Math.max(1, ...measured.map((factor) => factor.contribution));

  return (
    <div className={cn("space-y-4", className)}>
      <ul className="space-y-3">
        {measured.map((factor) => {
          const style = groupStyle[factor.group];
          return (
            <li key={factor.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{factor.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  +{factor.contribution.toFixed(1)} <span className="text-xs">pts</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                <div
                  className="h-full w-full origin-left rounded-full"
                  style={{
                    transform: `scaleX(${Math.max(0.02, factor.contribution / max)})`,
                    background: style.color,
                    transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)"
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{factor.detail}</span>
                <span className="shrink-0">weight {factor.weightPct.toFixed(0)}%</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
        {Object.entries(groupStyle).map(([key, style]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: style.color }} aria-hidden="true" />
            {style.label}
          </span>
        ))}
      </div>

      {unmeasured.length ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Not measured yet (excluded from the score, never assumed): {unmeasured.map((factor) => factor.label.toLowerCase()).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
