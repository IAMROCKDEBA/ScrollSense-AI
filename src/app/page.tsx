"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { m } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CircleCheck,
  Clock3,
  LineChart,
  Bot,
  PlaySquare,
  ScanSearch,
  Shield,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gauge, toneForRisk } from "@/components/ui/gauge";
import type { GaugeTone } from "@/components/ui/gauge";
import { Magnetic } from "@/components/ui/magnetic";
import { Reveal } from "@/components/ui/reveal";
import { Scrolly, scrollyForRisk } from "@/components/ui/scrolly";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclaimer } from "@/components/layout/disclaimer";
import { HeroVisual } from "@/components/hero/hero-visual";
import { generatePersona } from "@/data/demo-persona";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { ease } from "@/lib/motion";
import { useAppStore } from "@/store/app-store";

const steps = [
  {
    title: "Share your habits",
    body: "A short onboarding captures how, when and why you watch short-form video.",
    icon: Clock3
  },
  {
    title: "Scroll with a guardian",
    body: "State a goal, scroll a Reels-style feed, and let a live AI agent step in when it turns compulsive.",
    icon: PlaySquare
  },
  {
    title: "See your pattern",
    body: "An explainable score, a personal plan and a printable report. All on your device.",
    icon: BarChart3
  }
];

const privacyPoints = ["No phone tracking", "No private account access", "No login or database", "Local-first storage"];

export default function LandingPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);
  const loadPersona = useAppStore((state) => state.loadPersona);
  const router = useRouter();

  const hasAssessmentData = Boolean(profile || sessions.length > 0 || moodLogs.length > 0 || cognitiveResult);
  const completedDataGroups = [profile, sessions.length > 0, moodLogs.length > 0, cognitiveResult].filter(Boolean).length;
  const risk = useMemo(() => {
    if (!hasAssessmentData) return null;
    return predictRisk(buildRiskInput(profile, sessions, cognitiveResult, moodLogs));
  }, [cognitiveResult, hasAssessmentData, moodLogs, profile, sessions]);

  const scoreRows: { label: string; value: number; tag: string; tone: GaugeTone }[] = risk
    ? [
        { label: "Risk", value: risk.addictionRiskScore, tag: risk.finalRiskCategory, tone: toneForRisk(risk.addictionRiskScore) },
        risk.focusScore === null
          ? { label: "Self-control", value: 100 - risk.addictionRiskScore, tag: scoreTag(100 - risk.addictionRiskScore, false), tone: "rose" as GaugeTone }
          : { label: "Focus", value: risk.focusScore, tag: scoreTag(risk.focusScore, false), tone: "rose" as GaugeTone },
        { label: "Impulse", value: risk.impulseControlScore, tag: scoreTag(risk.impulseControlScore, false), tone: "orchid" },
        { label: "Well-being", value: risk.digitalWellbeingScore, tag: scoreTag(risk.digitalWellbeingScore, false), tone: "jade" }
      ]
    : [];

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* ------------------------------------------------------------ Hero */}
      <section className="grid min-w-0 items-center gap-10 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="min-w-0 space-y-8">
          <div className="rise inline-flex max-w-full items-center gap-2.5 rounded-full border border-foreground/15 bg-card/50 px-4 py-2 text-xs font-medium tracking-wide" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" />
              <span className="relative h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="truncate">AI short-form video well-being analyzer</span>
          </div>

          <h1
            className="rise font-display text-[2.7rem] font-medium leading-[1.02] tracking-tight sm:text-6xl xl:text-[5.4rem]"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Understand your scroll
            <span className="block">
              before it <em className="text-aurora pr-1 italic">controls you.</em>
            </span>
          </h1>

          <p className="rise max-w-xl text-base leading-8 text-muted-foreground sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            An agentic AI that watches how you scroll in real time, explains what it sees with real numbers, and helps
            you take back control. Your data stays in your browser.
          </p>

          <div className="rise flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--i": 3 } as React.CSSProperties}>
            <Magnetic className="w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/onboarding">
                  Start assessment
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic className="w-full sm:w-auto">
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    // Never overwrite a student's own data: only load the persona into an empty browser.
                    if (!hasAssessmentData) loadPersona(generatePersona(new Date()));
                    router.push("/dashboard");
                  }}
                >
                  {hasAssessmentData ? "Open my dashboard" : "Try the demo persona"}
                </button>
              </Button>
            </Magnetic>
          </div>

          <ul className="rise flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground" style={{ "--i": 4 } as React.CSSProperties}>
            {["Local-first", "No login", "Explainable score"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CircleCheck className="h-4 w-4 text-success-foreground" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise min-w-0" style={{ "--i": 2 } as React.CSSProperties}>
          <HeroVisual />
        </div>
      </section>

      <Reveal>
        <Disclaimer />
      </Reveal>

      {/* ------------------------------------------------- Live snapshot */}
      <section aria-labelledby="snapshot-title" className="space-y-8">
        <Reveal className="max-w-2xl space-y-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-primary">Your snapshot</p>
          <h2 id="snapshot-title" className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Your data, made legible.
          </h2>
        </Reveal>

        <Reveal>
          <Card variant="raised" className="p-6 sm:p-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Current assessment</div>
                <div className="font-display text-2xl font-medium tracking-tight">Risk summary</div>
              </div>
              <Badge variant={risk ? "success" : "outline"} dot>
                {risk ? (completedDataGroups >= 4 ? "Complete data" : "Partial data") : hydrated ? "No data yet" : "Loading"}
              </Badge>
            </div>

            {risk ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
                {scoreRows.map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-4 text-center">
                    <Gauge value={item.value} label={item.label} tone={item.tone} size={152} />
                    <Badge variant="outline">{item.tag}</Badge>
                  </div>
                ))}
              </div>
            ) : !hydrated ? (
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4" aria-busy="true">
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-col items-center gap-4">
                    <Skeleton className="h-[9.25rem] w-[9.25rem] !rounded-full" />
                    <Skeleton className="h-6 w-20 !rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
                <div className="mx-auto">
                  <Scrolly mood="sleepy" size={170} label="Scrolly is waiting for your data" />
                </div>
                <div className="space-y-5 text-center md:text-left">
                  <div>
                    <div className="font-display text-2xl font-medium tracking-tight">No result generated yet</div>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                      Complete onboarding, start a feed session, and save mood or cognitive data to generate a real
                      risk summary.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row md:justify-start">
                    <Button asChild>
                      <Link href="/onboarding">Start assessment</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Open dashboard</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {risk ? (
              <div className="mt-10 flex items-center justify-center gap-3 border-t border-foreground/10 pt-6 text-sm text-muted-foreground">
                <Scrolly mood={scrollyForRisk(risk.finalRiskCategory)} size={44} />
                <span>
                  Overall category: <strong className="font-semibold text-foreground">{risk.finalRiskCategory}</strong>.{" "}
                  <Link href="/dashboard" className="focus-ring rounded font-medium text-primary underline-offset-4 hover:underline">
                    See the full breakdown
                  </Link>
                </span>
              </div>
            ) : null}
          </Card>
        </Reveal>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section aria-labelledby="journey-title" className="space-y-10">
        <Reveal className="max-w-2xl space-y-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-primary">The journey</p>
          <h2 id="journey-title" className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Three steps from habit to clarity.
          </h2>
        </Reveal>

        <ol className="relative grid gap-5 md:grid-cols-3">
          <div
            className="pointer-events-none absolute left-[16%] right-[16%] top-[3.25rem] hidden h-px border-t border-dashed border-primary/35 md:block"
            aria-hidden="true"
          />
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Reveal delay={index * 0.1} className="h-full">
                  <Card className="h-full p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <span className="font-display text-5xl font-medium text-foreground/[0.12]" aria-hidden="true">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-medium tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </Card>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ------------------------------------------------------------ Bento */}
      <section aria-labelledby="features-title" className="space-y-10">
        <Reveal className="max-w-2xl space-y-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-primary">Inside the app</p>
          <h2 id="features-title" className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Everything you need to see clearly.
          </h2>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-6">
          <Reveal className="lg:col-span-4">
            <Card className="h-full p-6 sm:p-8">
              <FeatureHead icon={LineChart} title="Addiction risk prediction" />
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                An explainable scoring model blends self-report, session behavior, mood shifts and cognition into one
                transparent risk score you can actually interrogate.
              </p>
              <div className="mt-8 space-y-3" aria-hidden="true">
                {[
                  { label: "Focus", width: 72 },
                  { label: "Impulse control", width: 54 },
                  { label: "Memory", width: 83 },
                  { label: "Mood stability", width: 61 }
                ].map((bar, i) => (
                  <div key={bar.label} className="flex items-center gap-4">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">{bar.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                      <m.div
                        className="h-full origin-left rounded-full bg-metal"
                        style={{ width: `${bar.width}%` }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: ease.out, delay: 0.15 + i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground/80">Illustration</p>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-2">
            <Card className="h-full p-6 sm:p-8">
              <FeatureHead icon={Brain} title="Cognitive function tests" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Reaction time, memory recall and a Stroop challenge: three quick tasks that capture your focus.
              </p>
            </Card>
          </Reveal>

          <Reveal className="lg:col-span-2">
            <Card className="h-full p-6 sm:p-8">
              <FeatureHead icon={PlaySquare} title="Reels-style Shorts feed" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Full-screen vertical Shorts, one per swipe, while real hold time, skips and swipe speed are measured on your device.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-2">
            <Card className="h-full p-6 sm:p-8">
              <FeatureHead icon={Shield} title="Live Guardian agent" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                A live compulsion index triggers an AI agent that nudges you with evidence, pauses the feed or retunes it to calmer videos.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.16} className="lg:col-span-2">
            <Card className="h-full p-6 sm:p-8">
              <FeatureHead icon={BarChart3} title="Well-being dashboard" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Gauges, a radar and session history turn raw numbers into a clear picture.
              </p>
            </Card>
          </Reveal>

          <Reveal className="lg:col-span-3">
            <Card variant="raised" className="h-full p-6 sm:p-8">
              <FeatureHead icon={Bot} title="Sense Coach, an agentic chatbot" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Claude reads your real sessions, runs what-if simulations through the app&apos;s own scoring model, and takes actions for you, with every tool call shown and undoable.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href="/coach">
                  Meet the Coach
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </Card>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-3">
            <Card variant="raised" className="h-full p-6 sm:p-8">
              <FeatureHead icon={ScanSearch} title="Session Autopsy" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                After every session, an attention timeline and a grounded analysis show what actually happened, and every number the AI quotes is checked against your data.
              </p>
            </Card>
          </Reveal>

          <Reveal className="lg:col-span-6">
            <Card variant="raised" className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <FeatureHead icon={Sparkles} title="Personalized recommendations" />
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    A plan built from your own risk factors: immediate steps, a 7-day reset and study routines that
                    fit how you actually scroll.
                  </p>
                </div>
                <Button asChild variant="outline" className="self-start md:self-center">
                  <Link href="/recommendations">
                    See the plan
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- Privacy */}
      <section aria-labelledby="privacy-title">
        <Reveal>
          <Card variant="raised" className="overflow-hidden p-6 sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr]">
              <PrivacyShield />
              <div className="space-y-6">
                <div className="space-y-3">
                  <Badge variant="secondary">Important boundary</Badge>
                  <h2 id="privacy-title" className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                    Private by design. Honest about limits.
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    ScrollSense AI does not track your phone or private apps. It uses self-reported data, in-app
                    video interaction and cognitive tests to estimate digital well-being risk for an academic
                    mini-project. Your data lives in this browser; when you use an AI feature, a compact snapshot is
                    sent through the app&apos;s server to Claude to produce the answer, and nothing is stored server-side.
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {privacyPoints.map((item) => (
                    <li key={item} className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.035] px-4 py-3 text-sm">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-success-foreground" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- Final CTA */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] border border-foreground/10 bg-gradient-to-br from-primary/[0.14] via-secondary/[0.1] to-accent/[0.1] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
            <Scrolly mood="happy" size={110} />
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
              Ready to see <em className="text-aurora pr-1 italic">your</em> pattern?
            </h2>
            <p className="text-muted-foreground">It takes a few minutes, and your data stays in your browser.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Magnetic>
                <Button asChild size="lg">
                  <Link href="/onboarding">
                    Start assessment
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </Magnetic>
              <Button asChild variant="outline" size="lg">
                <Link href="/methodology">How it works</Link>
              </Button>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function FeatureHead({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-medium tracking-tight">{title}</h3>
    </div>
  );
}

function PrivacyShield() {
  return (
    <svg viewBox="0 0 160 180" className="mx-auto h-44 w-40 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--metal-1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--metal-3)" }} />
        </linearGradient>
      </defs>
      <m.path
        d="M80 8 L142 32 V86 C142 128 114 156 80 172 C46 156 18 128 18 86 V32 Z"
        fill="hsl(var(--primary) / 0.08)"
        stroke="url(#shield-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: ease.out }}
      />
      <m.path
        d="M52 90 L72 110 L110 66"
        fill="none"
        stroke="url(#shield-grad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: ease.out, delay: 1 }}
      />
    </svg>
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
