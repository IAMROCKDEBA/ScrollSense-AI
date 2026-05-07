"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Brain, Coffee, Pause, Play, RotateCcw, StepForward, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createId, formatDuration } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { FocusAfter, Mood, VideoItem, VideoSession, WatchReason, YouTubeSearchResponse } from "@/types";

const moods: Mood[] = ["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"];
const reasons: WatchReason[] = ["Entertainment", "Boredom", "Stress relief", "Habit", "Procrastination", "Learning", "Motivation"];
const focusOptions: FocusAfter[] = ["More focused", "Same", "Less focused"];

export default function FeedPage() {
  const profile = useAppStore((state) => state.profile);
  const demoMode = useAppStore((state) => state.demoMode);
  const addSession = useAppStore((state) => state.addSession);
  const addMoodLog = useAppStore((state) => state.addMoodLog);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [apiMode, setApiMode] = useState<"demo" | "youtube">("demo");
  const [apiMessage, setApiMessage] = useState("Loading videos...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [plannedMinutes, setPlannedMinutes] = useState(5);
  const [moodBefore, setMoodBefore] = useState<Mood>("Neutral");
  const [reason, setReason] = useState<WatchReason>("Entertainment");
  const [moodAfter, setMoodAfter] = useState<Mood>("Neutral");
  const [urge, setUrge] = useState(5);
  const [exceededPlanned, setExceededPlanned] = useState(false);
  const [focusAfter, setFocusAfter] = useState<FocusAfter>("Same");

  const [sessionActive, setSessionActive] = useState(false);
  const [postSessionOpen, setPostSessionOpen] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [videosWatched, setVideosWatched] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [nextClicks, setNextClicks] = useState(0);
  const [continuedAfterWarning, setContinuedAfterWarning] = useState(false);
  const [mindfulPauseCount, setMindfulPauseCount] = useState(0);
  const [pauseSeconds, setPauseSeconds] = useState(0);
  const [warningDismissed, setWarningDismissed] = useState(false);

  const sessionStartedAt = useRef<number | null>(null);
  const currentVideoStartedAt = useRef<number | null>(null);

  const currentVideo = videos[videoIndex % Math.max(1, videos.length)];
  const averageTimePerVideo = useMemo(
    () => (videosWatched > 0 ? Math.round(durationSeconds / videosWatched) : 0),
    [durationSeconds, videosWatched]
  );

  useEffect(() => {
    async function loadVideos() {
      setLoading(true);
      setError("");
      const queryForDemo = demoMode || (typeof window !== "undefined" && window.location.search.includes("demo=true"));

      try {
        const response = await fetch(`/api/youtube/search${queryForDemo ? "?demo=true" : ""}`);
        const data = (await response.json()) as YouTubeSearchResponse;
        setVideos(data.videos);
        setApiMode(data.mode);
        setApiMessage(data.message ?? `Loaded ${data.videos.length} public videos.`);
      } catch {
        setError("Video loading failed. Demo mode can still be used from Preferences.");
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
  }, [demoMode]);

  useEffect(() => {
    if (!sessionActive) return;
    const timer = window.setInterval(() => {
      setDurationSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionActive]);

  useEffect(() => {
    if (pauseSeconds <= 0) return;
    const timer = window.setTimeout(() => setPauseSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [pauseSeconds]);

  const showWarning = sessionActive && !warningDismissed && (durationSeconds >= 180 || videosWatched >= 8);

  function normalizedPlannedMinutes() {
    return Number.isFinite(plannedMinutes) && plannedMinutes > 0 ? plannedMinutes : 1;
  }

  function startSession() {
    if (videos.length === 0) return;
    setPlannedMinutes(normalizedPlannedMinutes());
    sessionStartedAt.current = Date.now();
    currentVideoStartedAt.current = Date.now();
    setSessionActive(true);
    setPostSessionOpen(false);
    setDurationSeconds(0);
    setVideosWatched(1);
    setSkipCount(0);
    setNextClicks(0);
    setContinuedAfterWarning(false);
    setMindfulPauseCount(0);
    setWarningDismissed(false);
    setVideoIndex(0);
  }

  function nextVideo() {
    if (!sessionActive || pauseSeconds > 0) return;
    const elapsedOnVideo = currentVideoStartedAt.current ? (Date.now() - currentVideoStartedAt.current) / 1000 : 0;
    if (elapsedOnVideo < 7) setSkipCount((count) => count + 1);
    currentVideoStartedAt.current = Date.now();
    setVideoIndex((index) => index + 1);
    setVideosWatched((count) => count + 1);
    setNextClicks((count) => count + 1);
  }

  function startMindfulPause() {
    setMindfulPauseCount((count) => count + 1);
    setPauseSeconds(30);
    if (showWarning) {
      setWarningDismissed(true);
    }
  }

  function continueIntentionally(fromWarning = false) {
    if (fromWarning) {
      setContinuedAfterWarning(true);
      setWarningDismissed(true);
    }
  }

  function endSession() {
    setSessionActive(false);
    setPostSessionOpen(true);
    setExceededPlanned(durationSeconds / 60 > normalizedPlannedMinutes());
  }

  function saveSession() {
    const startedAt = sessionStartedAt.current
      ? new Date(sessionStartedAt.current).toISOString()
      : new Date().toISOString();
    const safePlannedMinutes = normalizedPlannedMinutes();
    const session: VideoSession = {
      id: createId("session"),
      plannedMinutes: safePlannedMinutes,
      startedAt,
      endedAt: new Date().toISOString(),
      durationSeconds,
      videosWatched,
      skipCount,
      nextClicks,
      averageTimePerVideo,
      continuedAfterWarning,
      mindfulPauseCount,
      urgeToContinueScore: urge,
      moodBefore,
      moodAfter,
      reason,
      exceededPlannedTime: exceededPlanned,
      focusAfter
    };

    addSession(session);
    addMoodLog({
      id: createId("mood"),
      moodBefore,
      moodAfter,
      reason,
      urgeToContinueScore: urge,
      exceededPlannedTime: exceededPlanned,
      focusAfter,
      createdAt: new Date().toISOString()
    });
    setPostSessionOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Short-Video Session</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Watch a public embeddable feed, then compare planned time, actual behavior, mood shift, and urge to continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={apiMode === "youtube" ? "success" : "warning"}>
            {apiMode === "youtube" ? "Live feed active" : "Demo feed active"}
          </Badge>
          {profile ? <Badge variant="outline">Profile: {profile.name}</Badge> : <Badge variant="outline">No profile yet</Badge>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.74fr_0.26fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid min-h-[68vh] lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="relative grid min-h-[68vh] place-items-center bg-black">
                {loading ? (
                  <div className="text-sm text-white/70">Loading feed...</div>
                ) : error ? (
                  <div className="max-w-md px-6 text-center text-sm text-red-200">{error}</div>
                ) : currentVideo ? (
                  <>
                    <iframe
                      key={currentVideo.id}
                      className="h-full min-h-[68vh] w-full"
                      src={`${currentVideo.embedUrl}?rel=0&modestbranding=1`}
                      title={currentVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                    {pauseSeconds > 0 ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center text-white">
                        <div>
                          <Coffee className="mx-auto mb-4 h-10 w-10 text-sky-300" aria-hidden="true" />
                          <div className="text-4xl font-semibold">{pauseSeconds}</div>
                          <p className="mt-2 text-sm text-white/70">Mindful pause. Breathe, blink, and decide intentionally.</p>
                        </div>
                      </div>
                    ) : null}
                    {showWarning ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/80 px-4">
                        <div className="max-w-md rounded-lg border border-white/15 bg-slate-950/92 p-5 text-center text-white">
                          <Brain className="mx-auto mb-3 h-9 w-9 text-sky-300" aria-hidden="true" />
                          <h2 className="text-xl font-semibold">Pause for a moment.</h2>
                          <p className="mt-2 text-sm text-white/72">
                            Did you open this intentionally, or are you scrolling automatically?
                          </p>
                          <div className="mt-5 grid gap-2 sm:grid-cols-3">
                            <Button
                              size="sm"
                              onClick={() => continueIntentionally(true)}
                            >
                              Continue intentionally
                            </Button>
                            <Button size="sm" variant="outline" onClick={startMindfulPause}>
                              Take a mindful break
                            </Button>
                            <Button size="sm" variant="destructive" onClick={endSession}>
                              End session
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-sm text-white/70">No videos available.</div>
                )}
              </div>

              <div className="border-l bg-card p-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Now showing</div>
                    <div className="mt-1 line-clamp-3 font-medium">{currentVideo?.title ?? "Waiting for video"}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{currentVideo?.channelTitle}</div>
                  </div>

                  {!sessionActive && !postSessionOpen ? (
                    <div className="grid gap-3">
                      <Field label="Planned session minutes">
                        <Input type="number" min={1} max={120} value={plannedMinutes} onChange={(event) => setPlannedMinutes(Number(event.target.value))} />
                      </Field>
                      <Field label="Mood before">
                        <MoodSelect value={moodBefore} onChange={setMoodBefore} />
                      </Field>
                      <Field label="Reason for watching">
                        <Select value={reason} onChange={(event) => setReason(event.target.value as WatchReason)}>
                          {reasons.map((item) => <option key={item}>{item}</option>)}
                        </Select>
                      </Field>
                      <Button onClick={startSession} disabled={loading || videos.length === 0}>
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Start session
                      </Button>
                    </div>
                  ) : null}

                  {sessionActive ? (
                    <div className="grid gap-3">
                      <Metric label="Duration" value={formatDuration(durationSeconds)} />
                      <Metric label="Videos watched" value={String(videosWatched)} />
                      <Metric label="Skip count" value={String(skipCount)} />
                      <Metric label="Average per video" value={`${averageTimePerVideo}s`} />
                      <Button onClick={nextVideo} disabled={pauseSeconds > 0}>
                        <StepForward className="h-4 w-4" aria-hidden="true" />
                        Next video
                      </Button>
                      <Button onClick={startMindfulPause} variant="outline" disabled={pauseSeconds > 0}>
                        <Pause className="h-4 w-4" aria-hidden="true" />
                        30-second mindful pause
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => continueIntentionally(false)}
                      >
                        Continue intentionally
                      </Button>
                      <Button onClick={endSession} variant="destructive">
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        End session
                      </Button>
                    </div>
                  ) : null}

                  {postSessionOpen ? (
                    <div className="grid gap-3">
                      <Metric label="Final duration" value={formatDuration(durationSeconds)} />
                      <Field label="Mood after">
                        <MoodSelect value={moodAfter} onChange={setMoodAfter} />
                      </Field>
                      <Field label="Do you feel like continuing?">
                        <input className="w-full accent-sky-400" type="range" min={1} max={10} value={urge} onChange={(event) => setUrge(Number(event.target.value))} />
                        <div className="text-sm text-muted-foreground">{urge}/10</div>
                      </Field>
                      <Field label="Did you exceed your planned time?">
                        <Select value={exceededPlanned ? "Yes" : "No"} onChange={(event) => setExceededPlanned(event.target.value === "Yes")}>
                          <option>Yes</option>
                          <option>No</option>
                        </Select>
                      </Field>
                      <Field label="Focus after session">
                        <Select value={focusAfter} onChange={(event) => setFocusAfter(event.target.value as FocusAfter)}>
                          {focusOptions.map((item) => <option key={item}>{item}</option>)}
                        </Select>
                      </Field>
                      <Button onClick={saveSession}>Save session result</Button>
                      <Button variant="outline" onClick={startSession}>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Start another
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Feed status</CardTitle>
              <CardDescription>{apiMessage}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The feed uses public embedded videos when available and automatically falls back to demo videos when the live source cannot be reached.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next step</CardTitle>
              <CardDescription>Complete cognitive tests after a session for stronger analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/tests">Open cognitive tests</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MoodSelect({ value, onChange }: { value: Mood; onChange: (value: Mood) => void }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as Mood)}>
      {moods.map((mood) => <option key={mood}>{mood}</option>)}
    </Select>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/55 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
