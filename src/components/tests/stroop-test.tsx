"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { stroopColors, type StroopColor } from "@/data/stroop-data";
import { clamp } from "@/lib/utils";
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
    <Card>
      <CardHeader>
        <CardTitle>Stroop Test</CardTitle>
        <CardDescription>Select the actual displayed color, not the word meaning.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid min-h-36 place-items-center rounded-lg border bg-background/60 p-6">
          {started ? (
            <div className={`text-5xl font-semibold ${colorClass}`}>{round.word}</div>
          ) : (
            <p className="text-sm text-muted-foreground">{result ? "Result saved." : "Press Start to begin."}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {stroopColors.map((item) => (
            <Button key={item.name} variant="outline" onClick={() => answer(item.name)} disabled={!started}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.hex }} />
              {item.name}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start}>{started ? "Restart" : "Start"}</Button>
          <span className="text-sm text-muted-foreground">Round {started ? roundIndex : 0}/10</span>
        </div>
        {result ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            Stroop score: <span className="font-semibold">{result.score}/100</span> • Accuracy {result.accuracy}% • Average {result.averageMs}ms
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
