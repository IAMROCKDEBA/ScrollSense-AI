"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  LineChart,
  PlaySquare,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/layout/disclaimer";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { useAppStore } from "@/store/app-store";

const features = [
  { title: "YouTube-powered short-video feed", icon: PlaySquare },
  { title: "Addiction risk prediction", icon: LineChart },
  { title: "Cognitive function tests", icon: Brain },
  { title: "Mood and impulse tracking", icon: Clock3 },
  { title: "Digital well-being dashboard", icon: BarChart3 },
  { title: "Personalized recommendations", icon: Sparkles }
];

export default function LandingPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);

  const hasAssessmentData = Boolean(profile || sessions.length > 0 || moodLogs.length > 0 || cognitiveResult);
  const completedDataGroups = [profile, sessions.length > 0, moodLogs.length > 0, cognitiveResult].filter(Boolean).length;
  const risk = useMemo(() => {
    if (!hasAssessmentData) return null;
    return predictRisk(buildRiskInput(profile, sessions, cognitiveResult, moodLogs));
  }, [cognitiveResult, hasAssessmentData, moodLogs, profile, sessions]);

  const scoreRows = risk
    ? [
        { label: "Risk", value: risk.addictionRiskScore, tag: risk.finalRiskCategory },
        { label: "Focus", value: risk.focusScore, tag: scoreTag(risk.focusScore, false) },
        { label: "Impulse", value: risk.impulseControlScore, tag: scoreTag(risk.impulseControlScore, false) },
        { label: "Well-being", value: risk.digitalWellbeingScore, tag: scoreTag(risk.digitalWellbeingScore, false) }
      ]
    : [];

  return (
    <div className="space-y-10">
      <section className="grid min-h-[78vh] min-w-0 items-center gap-8 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="min-w-0 max-w-[calc(100vw-2rem)] space-y-6 lg:max-w-none"
        >
          <Badge variant="outline" className="w-full max-w-[calc(100vw-2rem)] whitespace-normal break-words border-primary/35 bg-primary/10 text-left leading-5 text-primary [overflow-wrap:anywhere]">
            <span className="sm:hidden">AI-powered short-video well-being analyzer</span>
            <span className="hidden sm:inline">
              AI-Powered Short-Form Video Addiction Risk Predictor and Digital Well-being Analyzer
            </span>
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-[calc(100vw-2rem)] break-words text-[1.65rem] font-semibold leading-tight tracking-normal sm:max-w-4xl sm:text-5xl lg:text-6xl">
              <span className="block">Understand your</span>
              <span className="block">short-form video habits</span>
              <span className="block">before they control you.</span>
            </h1>
            <p className="max-w-[calc(100vw-2rem)] text-sm leading-7 text-muted-foreground sm:max-w-2xl sm:text-lg">
              <span className="block sm:inline">An AI-powered digital well-being analyzer</span>{" "}
              <span className="block sm:inline">that estimates addiction risk using</span>{" "}
              <span className="block sm:inline">short-video behavior, mood patterns, and cognitive performance.</span>
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/onboarding">Start Assessment</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/feed?demo=true">Try Demo Mode</Link>
            </Button>
          </div>
          <Disclaimer />
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="relative min-w-0"
        >
          <div className="rounded-lg border bg-card/80 p-4 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Current assessment</div>
                <div className="text-xl font-semibold">Risk summary</div>
              </div>
              <Badge variant={risk ? "success" : "outline"}>
                {risk ? (completedDataGroups >= 4 ? "Complete data" : "Partial data") : hydrated ? "No data yet" : "Loading"}
              </Badge>
            </div>
            {risk ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {scoreRows.map((item) => (
                  <div key={item.label} className="rounded-lg border bg-background/60 p-4">
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-3xl font-semibold">{item.value}</span>
                      <span className="text-xs text-muted-foreground">{item.tag}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hydrated ? (
              <div className="rounded-lg border bg-background/60 p-4">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-background/60 p-4">
                <div className="text-lg font-semibold">No result generated yet</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Complete onboarding, start a feed session, and save mood or cognitive data to generate a real risk summary.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button asChild>
                    <Link href="/onboarding">Start assessment</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-4 rounded-lg border bg-background/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                Privacy-first academic design
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                {["No phone tracking", "No private account access", "No YouTube login", "Local-first storage"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardContent className="grid gap-4 p-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge variant="secondary">Important boundary</Badge>
            <h2 className="mt-3 text-2xl font-semibold">What ScrollSense AI measures</h2>
          </div>
          <p className="text-muted-foreground">
            This app does not track your phone or private apps. It uses self-reported data,
            in-app video interaction, and cognitive tests to estimate digital well-being risk
            for an academic mini-project.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function scoreTag(value: number, inverted: boolean) {
  if (inverted) {
    if (value <= 35) return "Healthy";
    if (value <= 60) return "Watch";
    return "Needs attention";
  }

  if (value >= 75) return "Strong";
  if (value >= 55) return "Stable";
  if (value >= 35) return "Watch";
  return "Needs attention";
}
