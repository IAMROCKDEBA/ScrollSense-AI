"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { spring } from "@/lib/motion";
import { useCoachStore } from "@/store/coach-store";
import { CoachChat } from "./coach-chat";

/** Floating entry point to the Coach on every page (except the Coach page itself and the immersive feed). */
export function CoachLauncher() {
  const pathname = usePathname();
  const open = useCoachStore((state) => state.open);
  const setOpen = useCoachStore((state) => state.setOpen);
  const busy = useCoachStore((state) => state.busy);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hidden = pathname === "/coach";

  useEffect(() => {
    if (!open || hidden) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useCoachStore.getState().setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, hidden]);

  if (hidden) return null;

  return (
    <>
      <m.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Sense Coach"
        aria-haspopup="dialog"
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
        data-print-hide
        className="focus-ring fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-metal pl-4 pr-5 text-sm font-semibold text-[hsl(300_50%_9%)] shadow-[0_18px_44px_-12px_hsl(350_80%_55%/0.7)] lg:bottom-6 lg:right-6"
      >
        <span className="relative grid h-5 w-5 place-items-center">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          {busy ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-[hsl(350_80%_45%)]" aria-hidden="true" /> : null}
        </span>
        Ask Coach
      </m.button>

      <AnimatePresence>
        {open ? (
          <m.div key="coach-drawer" className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-print-hide>
            <button type="button" tabIndex={-1} aria-label="Close coach" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-sm" />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Sense Coach"
              className="surface surface--raised absolute inset-x-3 bottom-3 top-[max(3rem,env(safe-area-inset-top))] flex flex-col overflow-hidden sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[30rem]"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={spring.soft}
            >
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close coach"
                className="focus-ring absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-foreground/15 bg-background/70 backdrop-blur"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <CoachChat compact className="h-full pt-0" />
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
