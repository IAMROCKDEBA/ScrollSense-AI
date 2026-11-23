"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowRight, Clock3, PlaySquare, Sparkles, TrendingUp, Video, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Gauge, toneForRisk } from "@/components/ui/gauge";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Reveal } from "@/components/ui/reveal";
import { Scrolly, scrollyForRisk } from "@/components/ui/scrolly";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { Disclaimer } from "@/components/layout/disclaimer";
import { ScoreBreakdown } from "@/components/dashboard/score-breakdown";
import { AttentionTimeline } from "@/components/feed/attention-timeline";
import { useCoachStore } from "@/store/coach-store";
import { buildRiskInput, scorableSessions } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";
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
  const router = useRouter();
  const askCoach = (question: string) => {
    useCoachStore.getState().setOpen(true);
    void useCoachStore.getState().send(question, { navigate: (path) => router.push(path) });
  };
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);
  const saveRiskScore = useAppStore((state) => state.saveRiskScore);
  const hasAssessmentData = Boolean(profile || sessions.length > 0 || moodLogs.length > 0 || cognitiveResult);

  const risk = useMemo(() => {
    if (!hasAssessmentData) return null;
    const input = buildRiskInput(profile, sessions, cognitiveResult, moodLogs);
    return predictRisk(input);
  }, [cognitiveResult, hasAssessmentData, moodLogs, profile, sessions]);
  const completedSessions = useMemo(() => scorableSessions(sessions), [sessions]);
  const latestSession = completedSessions.at(-1) ?? sessions.at(-1);

  useEffect(() => {
    if (!risk) return;
    saveRiskScore(risk);
  }, [risk, saveRiskScore]);

  // Higher is better on every axis (risk and mood dependency are inverted) so one chart reads consistently.
  const radarData = risk
    ? [
        risk.focusScore === null ? null : { subject: "Focus", value: risk.focusScore },
        risk.memoryScore === null ? null : { subject: "Memory", value: risk.memoryScore },
        { subject: "Impulse control", value: risk.impulseControlScore },
        { subject: "Mood stability", value: 100 - risk.moodDependencyScore },
        { subject: "Self-control", value: 100 - risk.addictionRiskScore },
        { subject: "Well-being", value: risk.digitalWellbeingScore }
      ].filter((point): point is { subject: string; value: number } => point !== null)
    : [];

  const barData = radarData.map((point) => ({ name: point.subject, value: point.value }));

  const lineData = completedSessions.map((session, index) => ({
    name: `S${index + 1}`,
    duration: Number.isFinite(session.durationSeconds) ? Math.round(session.durationSeconds / 60) : 0,
    videos: Number.isFinite(session.videosWatched) ? session.videosWatched : 0,
    urge: Number.isFinite(session.urgeToContinueScore) ? session.urgeToContinueScore : 0
  }));

  const completeness = [
    { label: "Onboarding", done: Boolean(profile) },
    { label: "Video session", done: sessions.length > 0 },
    { label: "Mood check-in", done: moodLogs.length > 0 },
    { label: "Cognitive tests", done: Boolean(cognitiveResult) }
  ];
  const completedCount = completeness.filter((item) => item.done).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights"
        title={
          <>
            Your explainable <em className="text-aurora pr-1 italic">dashboard.</em>
          </>
        }
        description="A local scoring model combines self-report, session behavior, mood shift, and cognitive results."
        actions={
          <Button asChild variant="outline">
            <Link href="/recommendations">
              Recommendations
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <Disclaimer />

      {!risk ? (
        <Card variant="raised">
          <CardContent className="grid items-center gap-6 p-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <Scrolly mood="sleepy" size={150} label="Scrolly is waiting for your data" />
            </div>
            <div className="space-y-5 text-center md:text-left">
              <div>
                <CardTitle className="text-2xl">No assessment result yet</CardTitle>
                <CardDescription className="mt-2 max-w-xl">
                  The dashboard will generate charts and scores after real assessment data is saved.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/onboarding">Start onboarding</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/feed">Start video session</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.7fr_0.3fr]">
        {risk ? (
          <Reveal>
            <Card variant="raised" className="h-full">
              <CardHeader>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-2xl">Overall Risk Summary</CardTitle>
                    <CardDescription>Risk categories: 0-25 Low, 26-50 Moderate, 51-75 High, 76-100 Critical.</CardDescription>
                  </div>
                  <Badge variant={categoryTone[risk.finalRiskCategory]} dot>
                    {risk.finalRiskCategory}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr]">
                  <div className="mx-auto hidden lg:block">
                    <Scrolly mood={scrollyForRisk(risk.finalRiskCategory)} size={130} />
                  </div>
                  <div className="grid justify-items-center gap-6 sm:grid-cols-3">
                    <Gauge value={risk.addictionRiskScore} label="Risk" tone={toneForRisk(risk.addictionRiskScore)} size={156} />
                    {risk.focusScore === null ? (
                      <Link
                        href="/tests"
                        className="focus-ring grid h-[156px] w-[156px] place-items-center rounded-full border border-dashed border-foreground/20 p-5 text-center text-xs leading-5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      >
                        Focus needs the
                        <br />
                        brain tests
                        <br />
                        <span className="text-primary">Take them →</span>
                      </Link>
                    ) : (
                      <Gauge value={risk.focusScore} label="Focus" tone="rose" size={156} />
                    )}
                    <Gauge value={risk.digitalWellbeingScore} label="Well-being" tone="jade" size={156} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ) : null}

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Data completeness</CardTitle>
              <CardDescription>
                Unmeasured inputs are excluded, never assumed. {risk ? `Model confidence: ${risk.confidence}%.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Inputs provided</span>
                <span className="font-display text-lg font-medium tabular-nums">{completedCount}/4</span>
              </div>
              <ProgressBar value={(completedCount / 4) * 100} label="Data completeness" tone="rose" />
              <div className="space-y-2 pt-2">
                {completeness.map((item) => (
                  <Completeness key={item.label} label={item.label} done={item.done} />
                ))}
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      {risk ? (
        <section className="grid gap-5 lg:grid-cols-3">
          <Reveal>
            <ScoreCard
              title="Memory Score"
              value={risk.memoryScore}
              description={risk.memoryScore === null ? "Not measured yet. Take the memory recall test to see this score." : "From the memory recall test."}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <ScoreCard title="Impulse Control Score" value={risk.impulseControlScore} description="From planned-vs-actual time, urge, and unintentional opening." />
          </Reveal>
          <Reveal delay={0.16}>
            <ScoreCard title="Mood Dependency Score" value={risk.moodDependencyScore} description="Higher values mean stronger emotional reliance on scrolling." inverted />
          </Reveal>
        </section>
      ) : null}

      <Reveal>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Latest Video Session</CardTitle>
                <CardDescription>Measured from real swipe, dwell and skip behaviour inside the Reels feed.</CardDescription>
              </div>
              {latestSession ? (
                <Badge variant={latestSession.completed === false ? "warning" : "success"} dot>
                  {latestSession.completed === false ? "Not saved" : "Completed"}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {latestSession ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat icon={<Timer />} label="Planned" value={`${formatSessionMinutes(latestSession.plannedMinutes)} min`} />
                <Stat icon={<Clock3 />} label="Duration" value={`${Math.round(latestSession.durationSeconds / 60)} min`} />
                <Stat icon={<Video />} label="Videos" value={String(latestSession.videosWatched)} />
                <Stat
                  icon={<PlaySquare />}
                  label="Started"
                  value={new Date(latestSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-foreground/15 p-5 text-sm text-muted-foreground">
                No video session data yet. Start a feed session to populate the dashboard and report.
              </div>
            )}
            {latestSession?.views?.length ? (
              <div className="mt-6 space-y-4 border-t border-foreground/10 pt-5">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Attention timeline</div>
                <AttentionTimeline views={latestSession.views} />
                {latestSession.autopsy ? (
                  <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
                    <div className="font-display text-lg font-medium tracking-tight">{latestSession.autopsy.headline}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{latestSession.autopsy.experimentForTomorrow}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Session Autopsy · {latestSession.autopsy.source === "ai" ? "Claude" : "offline analyst"}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Reveal>

      {risk ? <BehaviorCharts barData={barData} radarData={radarData} /> : null}

      {risk ? (
        <Reveal>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>How your score was calculated</CardTitle>
                  <CardDescription>Every point of the risk score, traced to a real measurement.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => askCoach("Explain my risk score in simple terms and tell me the one change that would help most.")}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Explain with Coach
                  </Button>
                  <Badge variant="outline">Confidence {risk.confidence}%</Badge>
                  {risk.trend ? (
                    <Badge variant={risk.trend.direction === "improving" ? "success" : risk.trend.direction === "worsening" ? "danger" : "outline"} dot>
                      {risk.trend.direction === "stable" ? "Stable trend" : `Trend ${risk.trend.direction}`}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScoreBreakdown breakdown={risk.breakdown} />
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {risk ? (
        <section className="grid gap-5 xl:grid-cols-[0.62fr_0.38fr]">
          <SessionHistoryChart lineData={lineData} />

          <Card>
            <CardHeader>
              <CardTitle>Top 3 Risk Factors</CardTitle>
              <CardDescription>Explainable outputs from the local scoring engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {risk.topRiskFactors.map((factor, index) => (
                <div key={factor} className="flex gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-metal font-display text-base font-semibold text-[hsl(300_50%_9%)]">
                    {index + 1}
                  </div>
                  <div className="pt-1 text-sm leading-6">{factor}</div>
                </div>
              ))}
              <div className="rounded-2xl border border-foreground/10 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
                {risk.explanation}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
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
  value: number | null;
  description: string;
  inverted?: boolean;
}) {
  if (value === null) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="p-6">
          <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
          <div className="mt-3 font-display text-3xl font-medium leading-none tracking-tight text-muted-foreground">Not measured</div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/tests">Take the tests</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  const good = inverted ? value < 45 : value >= 70;
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
            <div className="mt-3 font-display text-5xl font-medium leading-none tracking-tight">
              <CountUp value={value} />
            </div>
          </div>
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl border",
              good
                ? "border-success/30 bg-success/[0.12] text-success-foreground"
                : "border-warning/35 bg-warning/[0.14] text-warning-foreground"
            )}
          >
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={value} label={title} tone={good ? "jade" : "amber"} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Completeness({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.035] px-4 py-3 text-sm">
      <span>{label}</span>
      <Badge variant={done ? "success" : "outline"}>{done ? "Done" : "Missing"}</Badge>
    </div>
  );
}

function formatSessionMinutes(minutes: number) {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(2);
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
      <CardContent className="h-80 p-6" aria-busy="true" aria-label="Loading chart">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="mt-6 h-[calc(100%-3rem)] w-full" />
      </CardContent>
    </Card>
  );
}
