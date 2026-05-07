"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemoryTest } from "@/components/tests/memory-test";
import { ReactionTimeTest } from "@/components/tests/reaction-time-test";
import { StroopTest } from "@/components/tests/stroop-test";
import { useAppStore } from "@/store/app-store";

export default function TestsPage() {
  const result = useAppStore((state) => state.cognitiveResult);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Cognitive Tests</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            These tests estimate reaction speed, memory recall, and impulse-control related attention.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            View dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved cognitive results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Metric label="Reaction time" value={result?.reactionTimeMs ? `${result.reactionTimeMs}ms` : "Not taken"} />
          <Metric label="Memory score" value={result?.memoryScore !== undefined ? `${result.memoryScore}/100` : "Not taken"} />
          <Metric label="Stroop score" value={result?.stroopScore !== undefined ? `${result.stroopScore}/100` : "Not taken"} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <ReactionTimeTest />
        <MemoryTest />
        <StroopTest />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}
