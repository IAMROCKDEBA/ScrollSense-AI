"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Hourglass, MousePointerClick, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

type Status = "idle" | "waiting" | "ready" | "done";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function ReactionTimeTest() {
  const saveCognitiveResult = useAppStore((state) => state.saveCognitiveResult);
  const [status, setStatus] = useState<Status>("idle");
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [earlyClicks, setEarlyClicks] = useState(0);
  const readyAt = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function scheduleRound(nextRound: number) {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setStatus("waiting");
    setRound(nextRound);
    const delay = 1000 + Math.random() * 3000;
    timeoutRef.current = window.setTimeout(() => {
      readyAt.current = nowMs();
      setStatus("ready");
    }, delay);
  }

  function start() {
    setScores([]);
    setEarlyClicks(0);
    scheduleRound(1);
  }

  function clickPad() {
    if (status === "waiting") {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setEarlyClicks((count) => count + 1);
      setScores((current) => [...current, 1000]);
      if (round >= 5) {
        finish([...scores, 1000], earlyClicks + 1);
      } else {
        scheduleRound(round + 1);
      }
      return;
    }

    if (status === "ready") {
      const reaction = Math.round(nowMs() - readyAt.current);
      const nextScores = [...scores, reaction];
      setScores(nextScores);
      if (round >= 5) {
        finish(nextScores, earlyClicks);
      } else {
        scheduleRound(round + 1);
      }
    }
  }

  function finish(finalScores: number[], finalEarlyClicks: number) {
    setStatus("done");
    const average = Math.round(finalScores.reduce((sum, value) => sum + value, 0) / finalScores.length);
    saveCognitiveResult({
      reactionTimeMs: average,
      reactionEarlyClicks: finalEarlyClicks
    });
  }

  const average = scores.length
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : 0;

  const announcement =
    status === "ready" ? "Click now" : status === "waiting" ? "Wait for the signal" : status === "done" ? "Result saved" : "";

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
          <Zap className="h-5 w-5" aria-hidden="true" />
        </div>
        <CardTitle>Reaction Time Test</CardTitle>
        <CardDescription>Wait until “CLICK NOW” appears. Early clicks are penalized.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={clickPad}
          disabled={status === "idle" || status === "done"}
          className={cn(
            "focus-ring relative grid min-h-48 w-full place-items-center overflow-hidden rounded-3xl border p-6 text-center transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out",
            status === "idle" && "border-dashed border-foreground/20 bg-foreground/[0.03] text-muted-foreground",
            status === "waiting" && "border-warning/50 bg-warning/[0.1] text-warning-foreground",
            status === "ready" &&
              "scale-[1.015] border-success bg-success text-[hsl(160_80%_8%)] shadow-[0_0_60px_-10px_hsl(var(--success)/0.8)] active:scale-100",
            status === "done" && "border-success/40 bg-success/[0.1] text-success-foreground"
          )}
        >
          <span className="flex flex-col items-center gap-3 font-display text-2xl font-medium tracking-tight">
            {status === "idle" ? (
              <>
                <MousePointerClick className="h-7 w-7" aria-hidden="true" />
                Press Start
              </>
            ) : null}
            {status === "waiting" ? (
              <>
                <Hourglass className="h-7 w-7 animate-pulse" aria-hidden="true" />
                Wait...
              </>
            ) : null}
            {status === "ready" ? <span className="text-4xl font-semibold uppercase tracking-wide">Click now</span> : null}
            {status === "done" ? (
              <>
                <CircleCheck className="h-7 w-7" aria-hidden="true" />
                Saved
              </>
            ) : null}
          </span>
        </button>
        <p className="sr-only" role="status" aria-live="assertive">
          {announcement}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Round" value={`${Math.min(round, 5)}/5`} className="p-3" />
          <Stat label="Average" value={average ? `${average}ms` : "--"} className="p-3" />
          <Stat label="Early" value={String(earlyClicks)} className="p-3" />
        </div>
        <Button onClick={start}>{status === "idle" ? "Start" : "Restart"}</Button>
      </CardContent>
    </Card>
  );
}
