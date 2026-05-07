"use client";

import Link from "next/link";
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

const features = [
  { title: "YouTube-powered short-video feed", icon: PlaySquare },
  { title: "Addiction risk prediction", icon: LineChart },
  { title: "Cognitive function tests", icon: Brain },
  { title: "Mood and impulse tracking", icon: Clock3 },
  { title: "Digital well-being dashboard", icon: BarChart3 },
  { title: "Personalized recommendations", icon: Sparkles }
];

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="grid min-h-[78vh] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="space-y-6"
        >
          <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary">
            AI-Powered Short-Form Video Addiction Risk Predictor and Digital Well-being Analyzer
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
              Understand your short-form video habits before they control you.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              An AI-powered digital well-being analyzer that estimates addiction risk using
              short-video behavior, mood patterns, and cognitive performance.
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
          className="relative"
        >
          <div className="rounded-lg border bg-card/80 p-4 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Live assessment preview</div>
                <div className="text-xl font-semibold">Risk summary</div>
              </div>
              <Badge variant="warning">Demo</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Risk", "42", "Moderate"],
                ["Focus", "71", "Stable"],
                ["Impulse", "58", "Watch"],
                ["Well-being", "76", "Healthy"]
              ].map(([label, value, tag]) => (
                <div key={label} className="rounded-lg border bg-background/60 p-4">
                  <div className="text-sm text-muted-foreground">{label}</div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-3xl font-semibold">{value}</span>
                    <span className="text-xs text-muted-foreground">{tag}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Number(value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
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
