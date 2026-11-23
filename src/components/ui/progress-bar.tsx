"use client";

import { m } from "framer-motion";
import { clamp, cn } from "@/lib/utils";
import { ease } from "@/lib/motion";

interface ProgressBarProps {
  value: number;
  label: string;
  tone?: "rose" | "jade" | "amber" | "danger";
  className?: string;
}

const toneClass = {
  rose: "bg-metal",
  jade: "bg-gradient-to-r from-success/70 to-success",
  amber: "bg-gradient-to-r from-warning/70 to-warning",
  danger: "bg-gradient-to-r from-danger/70 to-danger"
} as const;

export function ProgressBar({ value, label, tone = "rose", className }: ProgressBarProps) {
  const safe = clamp(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
      className={cn("h-2 overflow-hidden rounded-full bg-foreground/10", className)}
    >
      <m.div
        className={cn("h-full w-full origin-left rounded-full", toneClass[tone])}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: safe / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: ease.out }}
      />
    </div>
  );
}
