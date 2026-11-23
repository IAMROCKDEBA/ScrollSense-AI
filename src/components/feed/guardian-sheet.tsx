"use client";

import { m } from "framer-motion";
import { Activity, Shield, Sparkles } from "lucide-react";
import type { GuardianEvent } from "@/types";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const accent = {
  gentle: { color: "hsl(160 60% 58%)", label: "Gentle nudge" },
  firm: { color: "hsl(38 92% 62%)", label: "Firm nudge" },
  urgent: { color: "hsl(350 90% 64%)", label: "Time to stop" }
} as const;

const primaryLabel: Record<GuardianEvent["action"], string> = {
  continue_calm_feed: "Got it",
  breathing_break: "30-second break",
  end_session: "End session",
  set_limit: "Set a limit",
  retune_feed: "Switch my feed"
};

interface GuardianSheetProps {
  event: GuardianEvent;
  limitMinutes?: number;
  onAccept: () => void;
  onDismiss: () => void;
  onEnd: () => void;
}

/** The Guardian's intervention: appears over the feed (which is paused) with the agent's reasoning and evidence. */
export function GuardianSheet({ event, limitMinutes, onAccept, onDismiss, onEnd }: GuardianSheetProps) {
  const style = accent[event.severity];
  const label = event.action === "set_limit" && limitMinutes ? `Limit to ${limitMinutes} min` : primaryLabel[event.action];

  return (
    <m.div
      role="alertdialog"
      aria-labelledby="guardian-title"
      aria-describedby="guardian-message"
      className="absolute inset-x-3 bottom-3 z-40 overflow-hidden rounded-[1.75rem] border border-white/15 bg-[hsl(287_30%_8%/0.88)] shadow-[0_30px_80px_-20px_black] backdrop-blur-xl"
      initial={{ y: 80, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={spring.soft}
    >
      <div className="h-1 w-full" style={{ background: style.color }} aria-hidden="true" />
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em]" style={{ color: style.color }}>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Live Guardian · {style.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 normal-case tracking-normal text-white/70">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {event.source === "ai" ? "Claude" : "Offline"} · index {event.compulsion}
          </span>
        </div>

        <div>
          <h2 id="guardian-title" className="font-display text-2xl font-medium leading-tight tracking-tight text-white">
            {event.headline}
          </h2>
          <p id="guardian-message" className="mt-1.5 text-sm leading-6 text-white/75">
            {event.message}
          </p>
        </div>

        {event.evidence.length ? (
          <ul className="space-y-1.5" aria-label="What the Guardian noticed">
            {event.evidence.map((line) => (
              <li key={line} className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-xs leading-5 text-white/70">
                <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: style.color }} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={cn("grid gap-2", event.action === "end_session" || event.action === "continue_calm_feed" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3")}>
          <button
            type="button"
            autoFocus
            onClick={onAccept}
            className="focus-ring h-12 rounded-full px-4 text-sm font-semibold text-[hsl(300_50%_9%)] transition-transform active:scale-95"
            style={{ background: style.color }}
          >
            {label}
          </button>
          <button type="button" onClick={onDismiss} className="focus-ring h-12 rounded-full border border-white/20 bg-white/[0.06] px-4 text-sm font-medium text-white transition-colors hover:bg-white/10">
            Keep scrolling
          </button>
          {event.action !== "end_session" && event.action !== "continue_calm_feed" ? (
            <button type="button" onClick={onEnd} className="focus-ring h-12 rounded-full px-4 text-sm font-medium text-white/70 transition-colors hover:text-white">
              End session
            </button>
          ) : null}
        </div>
      </div>
    </m.div>
  );
}
