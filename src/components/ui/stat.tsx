import * as React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  /** Tighter padding and smaller numerals for dense rails. */
  compact?: boolean;
  className?: string;
}

const toneClass = {
  default: "text-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  danger: "text-danger-foreground"
} as const;

/** Single data tile. Replaces the five ad-hoc `Metric` implementations. */
export function Stat({ label, value, hint, icon, tone = "default", compact, className }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-foreground/10 bg-foreground/[0.035] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        {icon ? <div className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</div> : null}
      </div>
      <div
        className={cn(
          "mt-2 font-display font-medium leading-none tracking-tight tabular-nums",
          compact ? "text-xl" : "text-[1.75rem]",
          toneClass[tone]
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
