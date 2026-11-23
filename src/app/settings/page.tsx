"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, FlaskConical, RefreshCw, TriangleAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { ThemeSegmented } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAiStatus } from "@/hooks/use-ai-status";
import { generatePersona } from "@/data/demo-persona";
import type { ShortsResponse } from "@/types";

export default function SettingsPage() {
  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);
  const sessions = useAppStore((state) => state.sessions);
  const moodLogs = useAppStore((state) => state.moodLogs);
  const cognitiveResult = useAppStore((state) => state.cognitiveResult);
  const riskScore = useAppStore((state) => state.riskScore);
  const demoMode = useAppStore((state) => state.demoMode);
  const setDemoMode = useAppStore((state) => state.setDemoMode);
  const resetAll = useAppStore((state) => state.resetAll);
  const loadPersona = useAppStore((state) => state.loadPersona);
  const demoPersona = useAppStore((state) => state.demoPersona);
  const ai = useAiStatus();
  const [feedStatus, setFeedStatus] = useState("Checking video feed...");
  const [feedConnected, setFeedConnected] = useState(false);
  const [dataStatus, setDataStatus] = useState("");
  const [isClearingData, setIsClearingData] = useState(false);

  const savedDataCount =
    (profile ? 1 : 0) +
    sessions.length +
    moodLogs.length +
    (cognitiveResult ? 1 : 0) +
    (riskScore ? 1 : 0);
  const hasSavedAssessmentData = savedDataCount > 0;

  const checkStatus = useCallback(async () => {
    setFeedStatus("Checking video feed...");
    try {
      const response = await fetch("/api/shorts?count=6", { cache: "no-store" });
      const data = (await response.json()) as ShortsResponse;
      setFeedConnected(data.mode === "youtube");
      setFeedStatus(data.mode === "youtube" ? "Live YouTube Shorts feed active" : data.message || "Offline Shorts pool active");
    } catch {
      setFeedConnected(false);
      setFeedStatus("Offline Shorts pool active");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkStatus, demoMode]);

  function clearSavedAssessmentData() {
    if (isClearingData || !hasSavedAssessmentData) return;

    setIsClearingData(true);
    setDataStatus("Clearing saved assessment data...");

    window.setTimeout(() => {
      resetAll();
      setIsClearingData(false);
      setDataStatus("Saved assessment data cleared from this browser.");
    }, 150);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Settings"
        title={
          <>
            Make it <em className="text-aurora pr-1 italic">yours.</em>
          </>
        }
        description="Manage the video feed mode, theme, and saved assessment data."
      />

      <section className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Video feed</CardTitle>
            <CardDescription>ScrollSense AI streams verified YouTube Shorts and falls back to an offline pool whenever the live feed is unavailable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3" role="status" aria-live="polite">
                {feedConnected ? (
                  <CircleCheck className="h-5 w-5 shrink-0 text-success-foreground" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="h-5 w-5 shrink-0 text-warning-foreground" aria-hidden="true" />
                )}
                <span className="min-w-0 text-sm">{feedStatus}</span>
              </div>
              <Badge variant={feedConnected ? "success" : "warning"} dot className="self-start sm:self-auto">
                {feedConnected ? "Live" : "Demo"}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
              <div className="min-w-0">
                <div id="demo-mode-label" className="font-medium">Offline demo pool</div>
                <div className="text-sm text-muted-foreground">Force the feed to use the bundled, pre-verified Shorts (no YouTube API calls).</div>
              </div>
              <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-labelledby="demo-mode-label" />
            </div>
            <Button variant="outline" onClick={checkStatus}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Check feed again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI agents</CardTitle>
            <CardDescription>Sense Coach, Live Guardian, Intent Studio and Session Autopsy run on Claude when an Anthropic key is configured on the server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
              <div className="min-w-0 text-sm" role="status" aria-live="polite">
                {ai === null
                  ? "Checking AI status..."
                  : ai.live
                    ? `Claude is connected (${ai.model}).`
                    : "No Anthropic key found, so scripted offline agents are active."}
              </div>
              <Badge variant={ai?.live ? "success" : "warning"} dot>
                {ai?.live ? "Live AI" : "Offline"}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Add <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs">ANTHROPIC_API_KEY</code> to the server environment and restart to enable live agents. Your key never reaches the browser.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo persona</CardTitle>
            <CardDescription>
              Load 14 days of realistic, generated history (12 sessions with full telemetry) so every dashboard, the Coach and the Autopsy have rich data to work with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
              <div className="min-w-0 text-sm">
                {demoPersona ? "Demo persona “Aarav” is loaded. All figures are generated, not real." : "No demo data loaded. Your own data stays untouched until you load it."}
              </div>
              <Badge variant={demoPersona ? "warning" : "outline"} dot>
                {demoPersona ? "Demo data" : "Off"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={hasSavedAssessmentData && !demoPersona}
                onClick={() => loadPersona(generatePersona(new Date()))}
              >
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                {demoPersona ? "Regenerate demo persona" : "Load demo persona"}
              </Button>
              {demoPersona ? (
                <Button variant="ghost" onClick={resetAll}>
                  Remove demo data
                </Button>
              ) : null}
            </div>
            {hasSavedAssessmentData && !demoPersona ? (
              <p className="text-xs leading-5 text-muted-foreground">
                You have your own saved data, so loading the persona is disabled. Clear your data below first if you want to demo with it.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance and data</CardTitle>
            <CardDescription>Theme and assessment data are saved only in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="text-[0.8125rem] font-medium tracking-wide text-foreground/90">Theme</div>
              <ThemeSegmented />
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Saved assessment status</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {hydrated
                      ? hasSavedAssessmentData
                        ? `${savedDataCount} saved item${savedDataCount === 1 ? "" : "s"} in this browser.`
                        : "No saved assessment data in this browser."
                      : "Checking saved data..."}
                  </div>
                </div>
                <Badge variant={hasSavedAssessmentData ? "warning" : "success"} dot>
                  {hasSavedAssessmentData ? "Data saved" : "Clear"}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <DataPoint label="Profile" value={profile ? "Saved" : "Empty"} />
                <DataPoint label="Video sessions" value={String(sessions.length)} />
                <DataPoint label="Mood logs" value={String(moodLogs.length)} />
                <DataPoint label="Cognitive tests" value={cognitiveResult ? "Saved" : "Empty"} />
                <DataPoint label="Risk score" value={riskScore ? "Saved" : "Empty"} />
              </div>
            </div>

            {dataStatus ? (
              <div
                className={cn(
                  "rounded-2xl border p-3.5 text-sm",
                  isClearingData
                    ? "border-warning/35 bg-warning/[0.1] text-warning-foreground"
                    : "border-success/35 bg-success/[0.1] text-success-foreground"
                )}
                role="status"
                aria-live="polite"
              >
                {dataStatus}
              </div>
            ) : null}

            <Button
              variant="destructive"
              onClick={clearSavedAssessmentData}
              disabled={isClearingData || !hasSavedAssessmentData}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {isClearingData
                ? "Clearing..."
                : hasSavedAssessmentData
                  ? "Clear saved assessment data"
                  : "No saved assessment data"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2.5">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
