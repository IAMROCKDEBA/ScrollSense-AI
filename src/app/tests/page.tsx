"use client";

import Link from "next/link";
import { ArrowRight, Gauge, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { MemoryTest } from "@/components/tests/memory-test";
import { ReactionTimeTest } from "@/components/tests/reaction-time-test";
import { StroopTest } from "@/components/tests/stroop-test";
import { useAppStore } from "@/store/app-store";

export default function TestsPage() {
  const result = useAppStore((state) => state.cognitiveResult);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Step 4 · Cognitive tests"
        title={
          <>
            Put your focus to the <em className="text-aurora pr-1 italic">test.</em>
          </>
        }
        description="These tests estimate reaction speed, memory recall, and impulse-control related attention."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">
              View dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <Card variant="raised">
        <CardHeader>
          <CardTitle>Saved cognitive results</CardTitle>
          <CardDescription>The latest score from each test feeds the risk model.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<Zap />}
            label="Reaction time"
            value={result?.reactionTimeMs ? `${result.reactionTimeMs}ms` : "Not taken"}
          />
          <Stat
            icon={<Brain />}
            label="Memory score"
            value={result?.memoryScore !== undefined ? `${result.memoryScore}/100` : "Not taken"}
          />
          <Stat
            icon={<Gauge />}
            label="Stroop score"
            value={result?.stroopScore !== undefined ? `${result.stroopScore}/100` : "Not taken"}
          />
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
