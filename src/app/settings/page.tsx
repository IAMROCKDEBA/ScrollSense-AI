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
  const demoMode = useAppStore((state) => state.demoMode);
  const setDemoMode = useAppStore((state) => state.setDemoMode);
  const resetAll = useAppStore((state) => state.resetAll);
  const { theme, setTheme } = useTheme();
  const [feedStatus, setFeedStatus] = useState("Checking video feed...");
  const [feedConnected, setFeedConnected] = useState(false);

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

            <Button variant="destructive" onClick={resetAll}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear saved assessment data
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
