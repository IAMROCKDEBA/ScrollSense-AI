"use client";

import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { FlaskConical, ScanSearch, Sparkles } from "lucide-react";
import { Scrolly } from "@/components/ui/scrolly";
import { Skeleton } from "@/components/ui/skeleton";
import { requestAutopsy } from "@/lib/ai/browser";
import { toAutopsyRequest } from "@/lib/ai/autopsy-request";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AutopsyResult, RiskScore, VideoSession } from "@/types";
import { AttentionTimeline } from "./attention-timeline";

const severityStyle = {
  info: { label: "Info", dot: "hsl(160 60% 58%)", bg: "hsl(160 60% 58% / 0.1)" },
  watch: { label: "Watch", dot: "hsl(38 92% 62%)", bg: "hsl(38 92% 62% / 0.1)" },
  concern: { label: "Concern", dot: "hsl(350 90% 64%)", bg: "hsl(350 90% 64% / 0.1)" }
} as const;

interface AutopsyPanelProps {
  session: VideoSession;
  risk: RiskScore | null;
  name?: string;
  onResult: (autopsy: AutopsyResult) => void;
}

/** After-session post-mortem: the measured attention timeline plus a grounded, evidence-citing analysis. */
export function AutopsyPanel({ session, risk, name, onResult }: AutopsyPanelProps) {
  const [result, setResult] = useState<AutopsyResult | null>(session.autopsy ?? null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || session.autopsy) return;
    started.current = true;
    let cancelled = false;
    requestAutopsy(toAutopsyRequest(session, risk, name)).then((autopsy) => {
      if (cancelled) return;
      setResult(autopsy);
      onResult(autopsy);
    });
    return () => {
      cancelled = true;
      started.current = false;
    };
    // The autopsy is requested once per saved session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  return (
    <section className="space-y-5" aria-labelledby="autopsy-title">
      <div className="surface surface--raised space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="autopsy-title" className="flex items-center gap-2 font-display text-xl font-medium tracking-tight">
            <ScanSearch className="h-5 w-5 text-primary" aria-hidden="true" />
            Session Autopsy
          </h2>
          {result ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {result.source === "ai" ? "Analysed by Claude · every number verified against your data" : "Offline analyst · computed from your data"}
            </span>
          ) : null}
        </div>
        {session.views?.length ? <AttentionTimeline views={session.views} /> : null}
      </div>

      {!result ? (
        <div className="surface space-y-4 p-6" role="status" aria-label="Analysing your session">
          <div className="flex items-center gap-4">
            <Scrolly mood="breathing" size={72} />
            <div>
              <div className="font-medium">Performing the autopsy…</div>
              <div className="text-sm text-muted-foreground">Reading every reel, swipe and skip of your session.</div>
            </div>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <m.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="space-y-5">
          <div className="surface p-6">
            <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">{result.headline}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.summary}</p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Patterns found">
            {result.patterns.map((pattern) => {
              const style = severityStyle[pattern.severity];
              return (
                <li key={pattern.title} className={cn("rounded-2xl border border-foreground/10 p-4")} style={{ background: style.bg }}>
                  <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]" style={{ color: style.dot }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: style.dot }} aria-hidden="true" />
                    {style.label}
                  </div>
                  <div className="mt-1.5 font-medium">{pattern.title}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{pattern.evidence}</p>
                </li>
              );
            })}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.08] p-4">
              <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-primary">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Experiment for tomorrow
              </div>
              <p className="mt-1.5 text-sm leading-6">{result.experimentForTomorrow}</p>
            </div>
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Effect on your score</div>
              <p className="mt-1.5 text-sm leading-6">{result.scoreNote}</p>
            </div>
          </div>
        </m.div>
      )}
    </section>
  );
}
