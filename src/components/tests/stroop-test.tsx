"use client";

import { useMemo, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { stroopColors, type StroopColor } from "@/data/stroop-data";
import { clamp, cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

interface Round {
  word: StroopColor;
  color: StroopColor;
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function randomRound(): Round {
  const word = stroopColors[Math.floor(Math.random() * stroopColors.length)].name;
  const color = stroopColors[Math.floor(Math.random() * stroopColors.length)].name;
  return { word, color };
}

export function StroopTest() {
  const saveCognitiveResult = useAppStore((state) => state.saveCognitiveResult);
  const [started, setStarted] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<Round>(() => randomRound());
  const [correct, setCorrect] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; accuracy: number; averageMs: number } | null>(null);
  const roundStartedAt = useRef<number>(0);

  const colorClass = useMemo(
    () => stroopColors.find((item) => item.name === round.color)?.className ?? "text-sky-400",
    [round.color]
  );

  function start() {
    setStarted(true);
    setRoundIndex(1);
    setCorrect(0);
    setTimes([]);
    setResult(null);
    setRound(randomRound());
    roundStartedAt.current = nowMs();
  }

  function answer(color: StroopColor) {
    if (!started) return;
    const responseTime = nowMs() - roundStartedAt.current;
    const nextCorrect = correct + (color === round.color ? 1 : 0);
    const nextTimes = [...times, responseTime];

    if (roundIndex >= 10) {
      const accuracy = Math.round((nextCorrect / 10) * 100);
      const averageMs = Math.round(nextTimes.reduce((sum, value) => sum + value, 0) / nextTimes.length);
      const speedScore = clamp(100 - Math.max(0, averageMs - 650) / 8);
      const score = Math.round(accuracy * 0.7 + speedScore * 0.3);
      setStarted(false);
      setResult({ score, accuracy, averageMs });
      saveCognitiveResult({
        stroopScore: score,
        stroopAccuracy: accuracy,
        stroopAverageMs: averageMs
      });
      return;
    }

    setCorrect(nextCorrect);
    setTimes(nextTimes);
    setRoundIndex((index) => index + 1);
    setRound(randomRound());
    roundStartedAt.current = nowMs();
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
          <Palette className="h-5 w-5" aria-hidden="true" />
        </div>
        <CardTitle>Stroop Test</CardTitle>
        <CardDescription>Select the actual displayed color, not the word meaning.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* The stimulus sits on a neutral dark stage so every ink color stays legible in both themes. */}
        <div className="grid min-h-48 place-items-center rounded-3xl border border-foreground/10 bg-[hsl(287_39%_6%)] p-6 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]">
          {started ? (
            <div key={roundIndex} className={cn("animate-[page-in_0.25s_var(--ease-out)_both] font-display text-6xl font-semibold tracking-tight", colorClass)}>
              {round.word}
            </div>
          ) : (
            <p className="text-sm text-[hsl(303_11%_69%)]">{result ? "Result saved." : "Press Start to begin."}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stroopColors.map((item) => (
            <Button key={item.name} variant="outline" onClick={() => answer(item.name)} disabled={!started}>
              <span className="h-3 w-3 rounded-full ring-1 ring-foreground/20" style={{ backgroundColor: item.hex }} aria-hidden="true" />
              {item.name}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={start}>{started ? "Restart" : "Start"}</Button>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                    started && i < roundIndex ? "bg-primary" : "bg-foreground/20"
                  )}
                />
              ))}
            </div>
            Round {started ? roundIndex : 0}/10
          </div>
        </div>
        {result ? (
          <div role="status" className="rounded-2xl border border-success/40 bg-success/[0.1] p-4 text-sm text-success-foreground">
            Stroop score: <span className="font-semibold">{result.score}/100</span> • Accuracy {result.accuracy}% • Average {result.averageMs}ms
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
