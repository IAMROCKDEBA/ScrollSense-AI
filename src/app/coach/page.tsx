"use client";

import { Activity, Compass, Eye, FlaskConical, Wind, Gauge, ListChecks, Target, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CoachChat } from "@/components/coach/coach-chat";
import { useAiStatus } from "@/hooks/use-ai-status";
import { useAppStore } from "@/store/app-store";

const toolGroups = [
  {
    title: "Sees your data",
    icon: Eye,
    tone: "hsl(190 70% 62%)",
    items: ["Risk score & breakdown", "Recent sessions & telemetry", "Mood before / after", "Brain-test results"]
  },
  {
    title: "Simulates outcomes",
    icon: FlaskConical,
    tone: "hsl(38 92% 62%)",
    items: ["What-if scenarios on the real scoring model"]
  },
  {
    title: "Acts in the app",
    icon: Compass,
    tone: "hsl(350 85% 70%)",
    items: ["Opens pages", "Breathing breaks", "Sets a daily limit", "Plans an intent feed", "Launches brain tests", "Saves commitments"]
  }
];

export default function CoachPage() {
  const ai = useAiStatus();
  const dailyLimit = useAppStore((state) => state.dailyLimitMinutes);
  const commitments = useAppStore((state) => state.commitments);
  const toggleCommitment = useAppStore((state) => state.toggleCommitment);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agentic AI"
        title={
          <>
            Meet your <em className="text-aurora pr-1 italic">Sense Coach.</em>
          </>
        }
        description="A Claude-powered agent that reasons over your real data, runs what-if simulations through the app's own scoring model, and takes actions for you."
        actions={
          <Badge variant={ai?.live ? "success" : "warning"} dot>
            {ai === null ? "Connecting" : ai.live ? "Live AI" : "Offline coach"}
          </Badge>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card variant="raised" className="overflow-hidden">
          <CoachChat className="h-[min(44rem,calc(100dvh-14rem))] min-h-[28rem]" />
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                Agent toolbox
              </CardTitle>
              <CardDescription>The model decides when to call these. Every call is shown in the chat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {toolGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.title}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${group.tone.replace(")", " / 0.15)")}`, color: group.tone }}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      {group.title}
                    </div>
                    <ul className="space-y-0.5 pl-9 text-xs leading-5 text-muted-foreground">
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                Your commitments
              </CardTitle>
              <CardDescription>Saved by you or by the Coach (you can undo any of them).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.035] px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Timer className="h-4 w-4" aria-hidden="true" /> Daily limit
                </span>
                <span className="font-medium tabular-nums">{dailyLimit ? `${dailyLimit} min` : "Not set"}</span>
              </div>
              {commitments.length === 0 ? (
                <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Try: “Help me commit to no Shorts after 11 pm this week.”
                </p>
              ) : (
                <ul className="space-y-2">
                  {commitments.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.035] px-4 py-3 text-sm">
                        <input type="checkbox" checked={item.done} onChange={() => toggleCommitment(item.id)} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
                        <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="flex gap-3 p-5 text-xs leading-5 text-muted-foreground">
              <Wind className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <Gauge className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                The Coach is a wellness tool, not a clinician. It never diagnoses, and it only sees the compact data snapshot this browser sends with each message.
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
