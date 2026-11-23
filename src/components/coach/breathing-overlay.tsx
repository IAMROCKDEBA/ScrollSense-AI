"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { Scrolly } from "@/components/ui/scrolly";
import { useCoachStore } from "@/store/coach-store";

/** Full-screen guided breathing break the Coach can trigger from anywhere in the app. */
export function BreathingOverlay() {
  const seconds = useCoachStore((state) => state.breakSeconds);
  const setBreak = useCoachStore((state) => state.setBreak);
  const active = seconds > 0;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      const current = useCoachStore.getState().breakSeconds;
      useCoachStore.getState().setBreak(Math.max(0, current - 1));
    }, 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useCoachStore.getState().setBreak(0);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {active ? (
        <m.div
          key="breathing"
          role="dialog"
          aria-modal="true"
          aria-label="Breathing break"
          className="dark fixed inset-0 z-[90] grid place-items-center bg-[hsl(287_39%_4%/0.94)] px-8 text-center text-white backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          data-print-hide
        >
          <div className="flex flex-col items-center">
            <div className="relative grid h-64 w-64 place-items-center">
              <span className="absolute inset-0 animate-[breathe_10s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,hsl(350_80%_70%/0.35),transparent_70%)] motion-reduce:animate-none" aria-hidden="true" />
              <Scrolly mood="breathing" size={170} />
            </div>
            <div className="mt-4 font-display text-6xl font-medium tabular-nums" aria-live="off">
              {seconds}
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/75">Breathe in for four, out for six. Let the next thing you watch be a choice.</p>
            <button
              type="button"
              autoFocus
              onClick={() => setBreak(0)}
              className="focus-ring mt-8 h-12 rounded-full border border-white/25 bg-white/[0.06] px-6 text-sm font-medium hover:bg-white/10"
            >
              I am ready
            </button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
