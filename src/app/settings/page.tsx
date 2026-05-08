"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { CheckCircle2, Moon, RefreshCw, Sun, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import type { YouTubeSearchResponse } from "@/types";

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
  const { theme, setTheme } = useTheme();
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
      const response = await fetch("/api/youtube/search");
      const data = (await response.json()) as YouTubeSearchResponse;
      setFeedConnected(data.mode === "youtube");
      setFeedStatus(data.mode === "youtube" ? "Live public video feed active" : "Demo video feed active");
    } catch {
      setFeedConnected(false);
      setFeedStatus("Demo video feed active");
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Preferences</h1>
        <p className="mt-2 text-muted-foreground">Manage the video feed mode, theme, and saved assessment data.</p>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Video feed</CardTitle>
            <CardDescription>ScrollSense AI uses demo videos whenever the live public feed is unavailable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-background/55 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <CheckCircle2 className={feedConnected ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-amber-300"} aria-hidden="true" />
                <span className="min-w-0">{feedStatus}</span>
              </div>
              <Badge variant={feedConnected ? "success" : "warning"}>{feedConnected ? "Live" : "Demo"}</Badge>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-background/55 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium">Demo mode</div>
                <div className="text-sm text-muted-foreground">Force the app to use local demo videos.</div>
              </div>
              <Button variant={demoMode ? "default" : "outline"} onClick={() => setDemoMode(!demoMode)}>
                {demoMode ? "On" : "Off"}
              </Button>
            </div>
            <Button variant="outline" onClick={checkStatus}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Check feed again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance and data</CardTitle>
            <CardDescription>Theme and assessment data are saved only in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-background/55 p-4">
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
                <Badge variant={hasSavedAssessmentData ? "warning" : "success"}>
                  {hasSavedAssessmentData ? "Data saved" : "Clear"}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <DataPoint label="Profile" value={profile ? "Saved" : "Empty"} />
                <DataPoint label="Video sessions" value={String(sessions.length)} />
                <DataPoint label="Mood logs" value={String(moodLogs.length)} />
                <DataPoint label="Cognitive tests" value={cognitiveResult ? "Saved" : "Empty"} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme ?? "system"} onChange={(event) => setTheme(event.target.value)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </Select>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Moon className="h-4 w-4" aria-hidden="true" />
                <Sun className="h-4 w-4" aria-hidden="true" />
                Choose whichever is easier to present.
              </div>
            </div>

            {dataStatus ? (
              <div
                className={
                  isClearingData
                    ? "rounded-lg border border-amber-500/30 bg-amber-500/12 p-3 text-sm text-amber-200"
                    : "rounded-lg border border-emerald-500/30 bg-emerald-500/12 p-3 text-sm text-emerald-200"
                }
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
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/45 px-3 py-2">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
