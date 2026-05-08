"use client";

import { useMemo } from "react";
import { Download, FileJson, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclaimer } from "@/components/layout/disclaimer";
import { exportReportCsv, exportReportJson } from "@/lib/export";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { useAppStore } from "@/store/app-store";
import type { ExportReport } from "@/types";

export default function ReportPage() {
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);

  const riskScore = useMemo(
    () => predictRisk(buildRiskInput(profile, sessions, cognitiveResult, moodLogs)),
    [cognitiveResult, moodLogs, profile, sessions]
  );
  const latestSession = sessions.at(-1) ?? null;

  const report: ExportReport = {
    profile,
    latestSession,
    moodLogs,
    cognitiveResult,
    riskScore,
    generatedAt: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Project Report</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            A presentation-ready report generated from the current local assessment data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportReportJson(report)} variant="outline">
            <FileJson className="h-4 w-4" aria-hidden="true" />
            Export result as JSON
          </Button>
          <Button onClick={() => exportReportCsv(report)} variant="outline">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export result as CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print report
          </Button>
        </div>
      </div>

      <Disclaimer />

      <Card>
        <CardContent className="space-y-8 p-6">
          <ReportSection title="Problem Statement">
            Students often use short-form video platforms for quick entertainment, learning, or stress relief. Repeated use can become automatic, extend beyond planned time, affect sleep, and reduce focus. ScrollSense AI estimates this risk without accessing private phone or platform data.
          </ReportSection>

          <ReportSection title="Objective">
            Build a local-first academic web app that combines self-reported usage, in-app video session behavior, mood check-ins, and cognitive tests to estimate short-form video addiction risk and recommend healthier routines.
          </ReportSection>

          <ReportSection title="Methodology">
            The system collects onboarding data, fetches public embeddable short-video approximations through the YouTube Data API or demo fallback, tracks session behavior, records mood changes, runs cognitive tests, and sends normalized values into an explainable scoring engine.
          </ReportSection>

          <ReportSection title="System Architecture">
            The interface collects assessment data, server-side video requests fetch public embedded content when available, this browser stores the student&apos;s saved assessment state, and the scoring engine generates scores and explanations. No authentication or database is required in version 1.
          </ReportSection>

          <ReportSection title="AI/ML Scoring Approach">
            This version uses an explainable scoring model inspired by machine-learning classification. Addiction risk increases when daily usage is high, planned time is exceeded, late-night use is frequent, urge to continue is high, mood worsens, sleep is low, study time is low, or cognitive performance is weak.
          </ReportSection>

          <ReportSection title="Session Data Snapshot">
            {latestSession ? (
              <div>
                <div className="mb-3">
                  <Badge variant={latestSession.endedAt ? "success" : "warning"}>
                    {latestSession.endedAt ? "Completed session" : "In-progress session"}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="Planned time" value={`${formatSessionMinutes(latestSession.plannedMinutes)} min`} />
                  <Metric label="Actual duration" value={`${Math.round(latestSession.durationSeconds / 60)} min`} />
                  <Metric label="Videos watched" value={String(latestSession.videosWatched)} />
                  <Metric label="Skip count" value={String(latestSession.skipCount)} />
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-muted-foreground">
                No video session has been started yet, so session behavior is not available for this report.
              </p>
            )}
          </ReportSection>

          <ReportSection title="Modules">
            Landing page, onboarding form, mood check-ins, YouTube-powered feed with demo fallback, reaction time test, memory recall test, Stroop test, dashboard, recommendations, methodology page, settings, and exportable report.
          </ReportSection>

          <ReportSection title="Results Interpretation">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Risk category" value={riskScore.finalRiskCategory} />
              <Metric label="Addiction risk" value={`${riskScore.addictionRiskScore}/100`} />
              <Metric label="Digital well-being" value={`${riskScore.digitalWellbeingScore}/100`} />
            </div>
            <div className="mt-4">
              <Badge variant="outline">Top factors</Badge>
              <ul className="mt-3 list-inside list-disc space-y-1 text-muted-foreground">
                {riskScore.topRiskFactors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </div>
          </ReportSection>

          <ReportSection title="Limitations">
            ScrollSense AI does not directly access private phone usage or third-party app activity. It estimates short-form video addiction risk using self-reported data, in-app behavior, and cognitive test results. It is not a medical diagnosis, scores are estimates rather than clinical assessments, and embedded YouTube videos are not downloaded or redistributed.
          </ReportSection>

          <ReportSection title="Future Scope">
            Replace the rule-based scorer with a trained Logistic Regression, Random Forest, or TensorFlow.js model; add consent-based longitudinal tracking; improve video classification; add optional authentication; and support anonymized research exports.
          </ReportSection>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function formatSessionMinutes(minutes: number) {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(2);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
