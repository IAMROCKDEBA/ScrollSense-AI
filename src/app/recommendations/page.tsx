"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, HelpCircle, ListChecks, Moon, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { Scrolly, scrollyForRisk } from "@/components/ui/scrolly";
import { Stat } from "@/components/ui/stat";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { Recommendation } from "@/types";

const categoryIcons = {
  Immediate: Target,
  "7-day plan": CalendarDays,
  "Study routine": ListChecks,
  Reflection: HelpCircle
};

const priorityAccent: Record<Recommendation["priority"], string> = {
  high: "before:bg-danger",
  medium: "before:bg-warning",
  low: "before:bg-foreground/25"
};

export default function RecommendationsPage() {
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);
  const hasAssessmentData = Boolean(profile || sessions.length > 0 || moodLogs.length > 0 || cognitiveResult);

  const risk = useMemo(() => {
    if (!hasAssessmentData) return null;
    return predictRisk(buildRiskInput(profile, sessions, cognitiveResult, moodLogs));
  }, [cognitiveResult, hasAssessmentData, moodLogs, profile, sessions]);

  const recommendationsByCategory = groupRecommendations(risk?.recommendations ?? []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights · Plan"
        title={
          <>
            Your personal <em className="text-aurora pr-1 italic">plan.</em>
          </>
        }
        description="Actions are generated from your current risk factors and can be used as a practical improvement plan."
      />

      {!risk ? (
        <Card variant="raised">
          <CardContent className="grid items-center gap-6 p-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <Scrolly mood="sleepy" size={150} label="Scrolly is waiting for your data" />
            </div>
            <div className="space-y-5 text-center md:text-left">
              <div>
                <CardTitle className="text-2xl">No personalized plan yet</CardTitle>
                <CardDescription className="mt-2 max-w-xl">
                  Recommendations are generated only after real assessment data exists.
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

      {risk ? (
        <section className="grid items-start gap-5 xl:grid-cols-[0.68fr_0.32fr]">
          <div className="space-y-5">
            {(["Immediate", "7-day plan", "Study routine", "Reflection"] as Recommendation["category"][]).map((category, index) => {
              const Icon = categoryIcons[category];
              const items = recommendationsByCategory[category] ?? [];
              return (
                <Reveal key={category} delay={index * 0.05}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/[0.1] text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <CardTitle>{category}</CardTitle>
                          <CardDescription>{descriptionFor(category)}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-foreground/15 p-4 text-sm text-muted-foreground">
                          No urgent action in this category from the current data.
                        </div>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "relative overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1",
                              priorityAccent[item.priority]
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h2 className="font-medium">{item.title}</h2>
                              <Badge variant={item.priority === "high" ? "danger" : item.priority === "medium" ? "warning" : "outline"}>
                                {item.priority}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <div className="space-y-5 xl:sticky xl:top-8">
            <Reveal>
              <Card variant="raised">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Current estimate</CardTitle>
                      <CardDescription>Generated by the local explainable scoring engine.</CardDescription>
                    </div>
                    <Scrolly mood={scrollyForRisk(risk.finalRiskCategory)} size={64} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Stat compact label="Risk category" value={risk.finalRiskCategory} />
                  <Stat compact label="Risk score" value={`${risk.addictionRiskScore}/100`} />
                  <Stat compact label="Digital well-being" value={`${risk.digitalWellbeingScore}/100`} />
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard">Review dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.06}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <Moon className="h-5 w-5 text-secondary" aria-hidden="true" />
                    <CardTitle>Study-friendly digital routine</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Start with study before entertainment, especially on exam or assignment days.</p>
                  <p>Keep a planned time limit visible before opening any short-video app.</p>
                  <p>Use the 30-second pause when scrolling feels automatic.</p>
                  <p>Keep the last 45 minutes before sleep screen-light and low-stimulation.</p>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.12}>
              <Card>
                <CardHeader>
                  <CardTitle>Reflection questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>What emotion most often starts the scrolling session?</p>
                  <p>Did the session help your original goal, or did it replace it?</p>
                  <p>What offline action could satisfy the same need for five minutes?</p>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function groupRecommendations(items: Recommendation[]) {
  return items.reduce<Partial<Record<Recommendation["category"], Recommendation[]>>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item];
    return acc;
  }, {});
}

function descriptionFor(category: Recommendation["category"]) {
  const copy: Record<Recommendation["category"], string> = {
    Immediate: "Actions you can take during the next session.",
    "7-day plan": "Small changes to repeat and compare over one week.",
    "Study routine": "Rules that protect attention before learning blocks.",
    Reflection: "Questions that reveal the trigger behind scrolling."
  };
  return copy[category];
}
