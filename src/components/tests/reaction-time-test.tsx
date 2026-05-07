"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reaction Time Test</CardTitle>
        <CardDescription>Wait until “CLICK NOW” appears. Early clicks are penalized.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={clickPad}
          disabled={status === "idle" || status === "done"}
          className="focus-ring grid min-h-44 w-full place-items-center rounded-lg border bg-background/60 p-6 text-center"
        >
          {status === "idle" ? "Press Start" : null}
          {status === "waiting" ? "Wait..." : null}
          {status === "ready" ? <span className="text-2xl font-semibold text-emerald-300">CLICK NOW</span> : null}
          {status === "done" ? "Saved" : null}
        </button>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric label="Round" value={`${Math.min(round, 5)}/5`} />
          <Metric label="Average" value={average ? `${average}ms` : "--"} />
          <Metric label="Early clicks" value={String(earlyClicks)} />
        </div>
        <Button onClick={start}>{status === "idle" ? "Start" : "Restart"}</Button>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
