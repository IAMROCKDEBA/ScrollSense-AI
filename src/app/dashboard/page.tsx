"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Disclaimer } from "@/components/layout/disclaimer";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { useAppStore } from "@/store/app-store";
import type { RiskCategory } from "@/types";

const BehaviorCharts = dynamic(
  () => import("@/components/charts/dashboard-charts").then((mod) => mod.BehaviorCharts),
  { ssr: false, loading: () => <ChartGridPlaceholder /> }
);

const SessionHistoryChart = dynamic(
  () => import("@/components/charts/dashboard-charts").then((mod) => mod.SessionHistoryChart),
  { ssr: false, loading: () => <ChartCardPlaceholder /> }
);

const categoryTone: Record<RiskCategory, "success" | "warning" | "danger"> = {
  Low: "success",
  Moderate: "warning",
  High: "warning",
  Critical: "danger"
};

export default function DashboardPage() {
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);
  const saveRiskScore = useAppStore((state) => state.saveRiskScore);

  const risk = useMemo(() => {
    const input = buildRiskInput(profile, sessions, cognitiveResult, moodLogs);
    return predictRisk(input);
  }, [cognitiveResult, moodLogs, profile, sessions]);

  useEffect(() => {
    saveRiskScore(risk);
  }, [risk, saveRiskScore]);

  const barData = [
    { name: "Risk", value: risk.addictionRiskScore },
    { name: "Focus", value: risk.focusScore },
    { name: "Memory", value: risk.memoryScore },
    { name: "Impulse", value: risk.impulseControlScore },
    { name: "Mood", value: risk.moodDependencyScore },
    { name: "Well-being", value: risk.digitalWellbeingScore }
  ];

  const radarData = [
    { subject: "Focus", value: risk.focusScore },
    { subject: "Memory", value: risk.memoryScore },
    { subject: "Impulse", value: risk.impulseControlScore },
    { subject: "Mood stability", value: 100 - risk.moodDependencyScore },
    { subject: "Well-being", value: risk.digitalWellbeingScore }
  ];

  const lineData = sessions.map((session, index) => ({
    name: `S${index + 1}`,
    duration: Number.isFinite(session.durationSeconds) ? Math.round(session.durationSeconds / 60) : 0,
    videos: Number.isFinite(session.videosWatched) ? session.videosWatched : 0,
    urge: Number.isFinite(session.urgeToContinueScore) ? session.urgeToContinueScore : 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-normal">Explainable Dashboard</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            A local scoring model combines self-report, session behavior, mood shift, and cognitive results.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/recommendations">
            Recommendations
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <Disclaimer />

      <section className="grid gap-5 xl:grid-cols-[0.7fr_0.3fr]">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Overall Risk Summary</CardTitle>
                <CardDescription>Risk categories: 0-25 Low, 26-50 Moderate, 51-75 High, 76-100 Critical.</CardDescription>
              </div>
              <Badge variant={categoryTone[risk.finalRiskCategory]}>{risk.finalRiskCategory}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <ProgressRing value={risk.addictionRiskScore} label="Risk" tone={risk.addictionRiskScore > 75 ? "red" : risk.addictionRiskScore > 50 ? "orange" : risk.addictionRiskScore > 25 ? "yellow" : "green"} />
            <ProgressRing value={risk.focusScore} label="Focus" tone="sky" />
            <ProgressRing value={risk.digitalWellbeingScore} label="Well-being" tone="green" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data completeness</CardTitle>
            <CardDescription>The model works with missing values, but more inputs make the estimate better.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Completeness label="Onboarding" done={Boolean(profile)} />
            <Completeness label="Video session" done={sessions.length > 0} />
            <Completeness label="Mood check-in" done={moodLogs.length > 0} />
            <Completeness label="Cognitive tests" done={Boolean(cognitiveResult)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ScoreCard title="Memory Score" value={risk.memoryScore} description="From the memory recall test." />
        <ScoreCard title="Impulse Control Score" value={risk.impulseControlScore} description="From planned-vs-actual time, urge, and unintentional opening." />
        <ScoreCard title="Mood Dependency Score" value={risk.moodDependencyScore} description="Higher values mean stronger emotional reliance on scrolling." inverted />
      </section>

      <BehaviorCharts barData={barData} radarData={radarData} />

      <section className="grid gap-5 xl:grid-cols-[0.62fr_0.38fr]">
        <SessionHistoryChart lineData={lineData} />

        <Card>
          <CardHeader>
            <CardTitle>Top 3 Risk Factors</CardTitle>
            <CardDescription>Explainable outputs from the local scoring engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {risk.topRiskFactors.map((factor, index) => (
              <div key={factor} className="flex gap-3 rounded-lg border bg-background/55 p-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="text-sm">{factor}</div>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/35 p-3 text-sm text-muted-foreground">
              {risk.explanation}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ScoreCard({
  title,
  value,
  description,
  inverted = false
}: {
  title: string;
  value: number;
  description: string;
  inverted?: boolean;
}) {
  const good = inverted ? value < 45 : value >= 70;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
          <TrendingUp className={good ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-amber-300"} aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Completeness({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/55 p-3 text-sm">
      <span>{label}</span>
      <Badge variant={done ? "success" : "outline"}>{done ? "Done" : "Missing"}</Badge>
    </div>
  );
}

function ChartGridPlaceholder() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <ChartCardPlaceholder />
      <ChartCardPlaceholder />
    </section>
  );
}

function ChartCardPlaceholder() {
  return (
    <Card>
      <CardContent className="grid h-80 place-items-center p-5 text-sm text-muted-foreground">
        Loading chart...
      </CardContent>
    </Card>
  );
}
