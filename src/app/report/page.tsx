"use client";

import { useMemo } from "react";
import { Download, FileJson, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo-mark";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
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
  const hasAssessmentData = Boolean(profile || sessions.length > 0 || moodLogs.length > 0 || cognitiveResult);

  const riskScore = useMemo(() => {
    if (!hasAssessmentData) return null;
    return predictRisk(buildRiskInput(profile, sessions, cognitiveResult, moodLogs));
  }, [cognitiveResult, hasAssessmentData, moodLogs, profile, sessions]);
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
    <div className="space-y-8">
      <div data-print-hide>
        <PageHeader
          eyebrow="Insights · Report"
          title={
            <>
              Your project <em className="text-aurora pr-1 italic">report.</em>
            </>
          }
          description="A presentation-ready report generated from the current local assessment data."
          actions={
            <>
              <Button onClick={() => exportReportJson(report)} variant="outline">
                <FileJson className="h-4 w-4" aria-hidden="true" />
                Export JSON
              </Button>
              <Button onClick={() => exportReportCsv(report)} variant="outline">
                <Download className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print report
              </Button>
            </>
          }
        />
      </div>

      {/* Print-only masthead */}
      <div className="hidden items-center gap-3 print:flex">
        <LogoMark size={40} />
        <div>
          <div className="font-display text-2xl font-medium">ScrollSense AI: Project Report</div>
          <div className="text-xs text-neutral-600">Generated {new Date(report.generatedAt).toLocaleString()}</div>
        </div>
      </div>

      <Disclaimer />

      <Card variant="raised">
        <CardContent className="space-y-10 p-6 sm:p-10">
          <ReportSection index={1} title="Problem Statement">
            Students often use short-form video platforms for quick entertainment, learning, or stress relief. Repeated use can become automatic, extend beyond planned time, affect sleep, and reduce focus. ScrollSense AI estimates this risk without accessing private phone or platform data.
          </ReportSection>

          <ReportSection index={2} title="Objective">
            Build a local-first academic web app that combines self-reported usage, in-app video session behavior, mood check-ins, and cognitive tests to estimate short-form video addiction risk and recommend healthier routines.
          </ReportSection>

          <ReportSection index={3} title="Methodology">
            The student completes a short profile, then states a goal in the Intent Studio, where an AI planner turns it into a curated feed of verified YouTube Shorts. A full-screen, Reels-style player records real telemetry (hold time per video, quick skips, rewatches, likes, swipe speed). A live Compulsion Index built from six weighted behavioural signals drives the Live Guardian agent, which intervenes with an evidence-citing nudge. After each session a Session Autopsy explains what actually happened. Mood check-ins and three cognitive mini-tests complete the evidence, and everything feeds a transparent weighted scoring model.
          </ReportSection>

          <ReportSection index={4} title="System Architecture">
            A Next.js application keeps all personal data in the student&apos;s own browser (localStorage). Server routes provide (1) a Shorts service that queries the YouTube Data API, verifies each video is a playable Short, caches results and rate-limits callers, and (2) AI routes that call the Claude Messages API. For each AI request the browser sends a compact snapshot of its data; the agent loop runs on the server, read and what-if tools execute against that snapshot, and action tools (open a page, start a breathing break, set a limit) are streamed back to the browser, where the student can undo them. The API key never leaves the server, and every AI feature has a deterministic offline fallback.
          </ReportSection>

          <ReportSection index={5} title="AI/ML Scoring Approach">
            The system has two layers. The scoring layer is a transparent weighted model over 17 normalised factors: unmeasured factors are excluded and the remaining weights renormalised (nothing is assumed), a confidence value reports how much of the model is backed by real measurements, and every point of the score is traced to a factor. This is a rule-based model, not a trained classifier. The reasoning layer uses Claude: the Sense Coach agent calls tools to read the data and to run what-if simulations through the same scoring model; the Guardian, Intent Planner and Autopsy analyst return schema-validated structured outputs, and a numeric grounding guard rejects any claim whose numbers are not present in the measured data.
          </ReportSection>

          <ReportSection index={6} title="Session Data Snapshot">
            {latestSession ? (
              <div>
                <div className="mb-4">
                  <Badge variant={latestSession.completed === false ? "warning" : "success"} dot>
                    {latestSession.completed === false ? "Unsaved session" : "Completed session"}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Stat label="Planned time" value={`${formatSessionMinutes(latestSession.plannedMinutes)} min`} />
                  <Stat label="Actual duration" value={`${Math.round(latestSession.durationSeconds / 60)} min`} />
                  <Stat label="Videos watched" value={String(latestSession.videosWatched)} />
                  <Stat label="Skip count" value={String(latestSession.skipCount)} />
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-foreground/15 p-4">
                No video session has been started yet, so session behavior is not available for this report.
              </p>
            )}
          </ReportSection>

          <ReportSection index={7} title="Modules">
            Landing page, onboarding form, Intent Studio, Reels-style Shorts feed with live telemetry, Live Guardian agent, Session Autopsy, Sense Coach (agentic chatbot with tools), reaction time test, memory recall test, Stroop test, dashboard with score breakdown, recommendations, methodology page, settings with a demo persona, and an exportable report.
          </ReportSection>

          <ReportSection index={8} title="Results Interpretation">
            {riskScore ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Stat label="Risk category" value={riskScore.finalRiskCategory} />
                  <Stat label="Addiction risk" value={`${riskScore.addictionRiskScore}/100`} />
                  <Stat label="Digital well-being" value={`${riskScore.digitalWellbeingScore}/100`} />
                </div>
                <div className="mt-5">
                  <Badge variant="outline">Top factors</Badge>
                  <ul className="mt-3 list-inside list-disc space-y-1.5">
                    {riskScore.topRiskFactors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-foreground/15 p-4">
                No result has been generated yet because no assessment data has been saved.
              </p>
            )}
          </ReportSection>

          <ReportSection index={9} title="Limitations">
            ScrollSense AI does not access private phone usage or third-party app activity: its behavioural signals come only from the in-app Shorts feed, plus self-report and cognitive tests. It is not a medical diagnosis, and scores are estimates rather than clinical assessments. The scoring weights are hand-set and not yet validated against a clinical instrument. LLM output can be wrong; the grounding guard and offline fallbacks reduce, but cannot eliminate, that risk. Embedded YouTube videos are not downloaded or redistributed.
          </ReportSection>

          <ReportSection index={10} title="Future Scope">
            Validate the weights against a clinical short-video-use scale and fit a supervised model on consented longitudinal data; add an Android Usage Access integration for real cross-app measurement; add optional accounts with end-to-end encrypted sync; and support anonymised research exports.
          </ReportSection>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportSection({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 sm:grid-cols-[3.5rem_1fr] print:break-inside-avoid">
      <div className="font-display text-3xl font-medium text-foreground/20 print:text-neutral-400" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </div>
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">{title}</h2>
        <div className="mt-3 text-[0.9375rem] leading-8 text-muted-foreground print:text-neutral-700">{children}</div>
      </div>
    </section>
  );
}

function formatSessionMinutes(minutes: number) {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(2);
}
