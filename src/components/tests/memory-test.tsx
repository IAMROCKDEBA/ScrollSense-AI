"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    <Card>
      <CardHeader>
        <CardTitle>Memory Recall Test</CardTitle>
        <CardDescription>Memorize 8 words for 10 seconds, then type the words you remember.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-background/60 p-4">
          {showWords ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {words.map((word) => (
                <div key={word} className="rounded-lg bg-muted p-3 text-center font-medium">
                  {word}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {words.length ? "Words are hidden. Type what you remember." : "Press Start to generate words."}
            </p>
          )}
        </div>
        <Textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type remembered words separated by spaces or commas"
          disabled={showWords || words.length === 0}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={start}>Start</Button>
          <Button onClick={submit} variant="outline" disabled={showWords || words.length === 0 || answer.trim().length === 0}>
            Save memory score
          </Button>
        </div>
        {score !== null ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            Memory score: <span className="font-semibold">{score}/100</span> ({remembered}/8 words)
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
