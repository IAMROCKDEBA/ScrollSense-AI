"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { wordBank } from "@/data/word-bank";
import { useAppStore } from "@/store/app-store";

function pickWords() {
  return [...wordBank].sort(() => Math.random() - 0.5).slice(0, 8);
}

export function MemoryTest() {
  const saveCognitiveResult = useAppStore((state) => state.saveCognitiveResult);
  const hideTimerRef = useRef<number | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [showWords, setShowWords] = useState(false);
  const [runId, setRunId] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [remembered, setRemembered] = useState(0);

  const normalizedAnswer = useMemo(
    () =>
      new Set(
        answer
          .toLowerCase()
          .split(/[\s,]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    [answer]
  );

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  function start() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    const nextWords = pickWords();
    setWords(nextWords);
    setShowWords(true);
    setRunId((id) => id + 1);
    setAnswer("");
    setScore(null);
    setRemembered(0);
    hideTimerRef.current = window.setTimeout(() => setShowWords(false), 10000);
  }

  function submit() {
    const hits = words.filter((word) => normalizedAnswer.has(word.toLowerCase())).length;
    const result = Math.round((hits / words.length) * 100);
    setRemembered(hits);
    setScore(result);
    saveCognitiveResult({
      memoryScore: result,
      memoryWordsRemembered: hits
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
          <Brain className="h-5 w-5" aria-hidden="true" />
        </div>
        <CardTitle>Memory Recall Test</CardTitle>
        <CardDescription>Memorize 8 words for 10 seconds, then type the words you remember.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-48 rounded-3xl border border-foreground/10 bg-foreground/[0.03] p-4">
          {showWords ? (
            <div key={runId} className="space-y-4">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
                role="timer"
                aria-label="Words are visible for 10 seconds"
              >
                <div className="h-full origin-left rounded-full bg-metal animate-[countdown_10s_linear_forwards]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {words.map((word, index) => (
                  <div
                    key={word}
                    className="rise rounded-2xl border border-foreground/10 bg-foreground/[0.06] p-3 text-center font-display text-lg font-medium tracking-tight"
                    style={{ "--i": index } as React.CSSProperties}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="grid h-full min-h-40 place-items-center text-center text-sm text-muted-foreground">
              {words.length ? "Words are hidden. Type what you remember." : "Press Start to generate words."}
            </p>
          )}
        </div>
        <Textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type remembered words separated by spaces or commas"
          aria-label="Words you remember"
          disabled={showWords || words.length === 0}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={start}>Start</Button>
          <Button onClick={submit} variant="outline" disabled={showWords || words.length === 0 || answer.trim().length === 0}>
            Save memory score
          </Button>
        </div>
        {score !== null ? (
          <div role="status" className="rounded-2xl border border-success/40 bg-success/[0.1] p-4 text-sm text-success-foreground">
            Memory score: <span className="font-semibold">{score}/100</span> ({remembered}/8 words)
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
