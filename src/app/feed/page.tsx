"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw, StepForward, Volume2, VolumeX, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { YouTubePlayer } from "@/components/feed/youtube-player";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Scrolly } from "@/components/ui/scrolly";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { createId, formatDuration } from "@/lib/utils";
import { youtubeQueries } from "@/lib/youtube";
import { useAppStore } from "@/store/app-store";
import type { FocusAfter, Mood, VideoItem, VideoSession, WatchReason, YouTubeSearchResponse } from "@/types";

const moods: Mood[] = ["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"];
const reasons: WatchReason[] = ["Entertainment", "Boredom", "Stress relief", "Habit", "Procrastination", "Learning", "Motivation"];
const focusOptions: FocusAfter[] = ["More focused", "Same", "Less focused"];
const AUTO_REFRESH_MS = 2 * 60 * 1000;

export default function FeedPage() {
  const profile = useAppStore((state) => state.profile);
  const demoMode = useAppStore((state) => state.demoMode);
  const addSession = useAppStore((state) => state.addSession);
  const addMoodLog = useAppStore((state) => state.addMoodLog);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [apiMode, setApiMode] = useState<"demo" | "youtube">("demo");
  const [apiMessage, setApiMessage] = useState("Loading videos...");
  const [lastFeedRefresh, setLastFeedRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [plannedMinutes, setPlannedMinutes] = useState("5");
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [youtubeControlsEnabled, setYoutubeControlsEnabled] = useState(false);

  const sessionStartedAt = useRef<number | null>(null);
  const currentVideoStartedAt = useRef<number | null>(null);
  const lastScrollAdvanceAt = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const batchIndex = useRef(0);
  const seenVideoIds = useRef<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);
  const activeSessionId = useRef<string | null>(null);

  const currentVideo = videos[videoIndex] ?? videos[0];
  const averageTimePerVideo = useMemo(
    () => (videosWatched > 0 ? Math.round(durationSeconds / videosWatched) : 0),
    [durationSeconds, videosWatched]
  );
  const plannedSessionMinutes = useMemo(() => {
    const parsed = Number(plannedMinutes);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [plannedMinutes]);
  const plannedSessionSeconds = plannedSessionMinutes * 60;
  const remainingSeconds = Math.max(0, Math.round(plannedSessionSeconds - durationSeconds));
  const plannedProgress = Math.min(100, Math.round((durationSeconds / plannedSessionSeconds) * 100));

  const loadVideoBatch = useCallback(async (append = false) => {
    if (append && loadingMoreRef.current) return 0;

    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError("");
      setVideoIndex(0);
      batchIndex.current = 0;
      seenVideoIds.current = new Set();
    }

    const forceDemo = demoMode || (typeof window !== "undefined" && window.location.search.includes("demo=true"));
    const params = new URLSearchParams();
    const query = youtubeQueries[batchIndex.current % youtubeQueries.length];
    batchIndex.current += 1;

    if (forceDemo) {
      params.set("demo", "true");
    } else {
      params.set("q", query);
      params.set("refresh", String(batchIndex.current));
      const excludes = Array.from(seenVideoIds.current).slice(-45);
      if (excludes.length > 0) {
        params.set("exclude", excludes.join(","));
      }
    }

    try {
      const response = await fetch(`/api/youtube/search?${params.toString()}`);
      const data = (await response.json()) as YouTubeSearchResponse;
      const shuffled = shuffleVideos(data.videos);
      const uniqueVideos = shuffled.filter((video) => !seenVideoIds.current.has(video.id));
      const nextVideos = append ? uniqueVideos : uniqueVideos.length > 0 ? uniqueVideos : shuffled;

      nextVideos.forEach((video) => seenVideoIds.current.add(video.id));

      setVideos((current) => (append ? [...current, ...nextVideos] : nextVideos));
      setApiMode(data.mode);
      setLastFeedRefresh(new Date().toISOString());
      setApiMessage(
        append
          ? nextVideos.length > 0
            ? `Added ${nextVideos.length} new public videos.`
            : "No new videos were returned in this batch. Try again or switch demo mode."
          : data.message ?? `Loaded ${nextVideos.length} public videos.`
      );
      return nextVideos.length;
    } catch {
      setError("Video loading failed. Demo mode can still be used from Preferences.");
      return 0;
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [demoMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadVideoBatch(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadVideoBatch]);

  useEffect(() => {
    if (!sessionActive) return;
    const timer = window.setInterval(() => {
      setDurationSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive) return;

    const refreshTimer = window.setInterval(() => {
      void loadVideoBatch(true);
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(refreshTimer);
  }, [loadVideoBatch, sessionActive]);

  useEffect(() => {
    if (pauseSeconds <= 0) return;
    const timer = window.setTimeout(() => setPauseSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [pauseSeconds]);

  const showWarning = sessionActive && !warningDismissed && (durationSeconds >= 180 || videosWatched >= 8);

  function normalizedPlannedMinutes() {
    return plannedSessionMinutes;
  }

  const persistCurrentSession = useCallback((overrides: Partial<VideoSession> = {}) => {
    if (!activeSessionId.current || !sessionStartedAt.current) return;

    const session: VideoSession = {
      id: activeSessionId.current,
      plannedMinutes: plannedSessionMinutes,
      startedAt: new Date(sessionStartedAt.current).toISOString(),
      durationSeconds,
      videosWatched,
      skipCount,
      nextClicks,
      averageTimePerVideo,
      continuedAfterWarning,
      mindfulPauseCount,
      urgeToContinueScore: postSessionOpen ? urge : 0,
      moodBefore,
      reason,
      exceededPlannedTime: durationSeconds / 60 > plannedSessionMinutes,
      ...overrides
    };

    addSession(session);
  }, [
    addSession,
    averageTimePerVideo,
    continuedAfterWarning,
    durationSeconds,
    mindfulPauseCount,
    moodBefore,
    nextClicks,
    plannedSessionMinutes,
    postSessionOpen,
    reason,
    skipCount,
    urge,
    videosWatched
  ]);

  useEffect(() => {
    if (!sessionActive) return;
    if (durationSeconds === 0 || durationSeconds % 5 === 0) {
      persistCurrentSession();
    }
  }, [durationSeconds, persistCurrentSession, sessionActive]);

  useEffect(() => {
    if (!sessionActive) return;

    function saveBeforeLeaving() {
      persistCurrentSession();
    }

    function saveWhenHidden() {
      if (document.visibilityState === "hidden") {
        persistCurrentSession();
      }
    }

    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveWhenHidden);

    return () => {
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [persistCurrentSession, sessionActive]);

  function createInitialSession(sessionId: string, startedAt: number, plannedMinutes: number): VideoSession {
    return {
      id: sessionId,
      plannedMinutes,
      startedAt: new Date(startedAt).toISOString(),
      durationSeconds: 0,
      videosWatched: 1,
      skipCount: 0,
      nextClicks: 0,
      averageTimePerVideo: 0,
      continuedAfterWarning: false,
      mindfulPauseCount: 0,
      urgeToContinueScore: 0,
      moodBefore,
      reason,
      exceededPlannedTime: false
    };
  }

  function startSession() {
    if (videos.length === 0) return;
    const plannedMinutes = normalizedPlannedMinutes();
    const startedAt = Date.now();
    const sessionId = createId("session");

    activeSessionId.current = sessionId;
    sessionStartedAt.current = startedAt;
    currentVideoStartedAt.current = startedAt;
    addSession(createInitialSession(sessionId, startedAt, plannedMinutes));

    setPlannedMinutes(String(plannedMinutes));
    setSessionActive(true);
    setPostSessionOpen(false);
    setDurationSeconds(0);
    setVideosWatched(1);
    setSkipCount(0);
    setNextClicks(0);
    setContinuedAfterWarning(false);
    setMindfulPauseCount(0);
    setWarningDismissed(false);
    setVideoPlaying(true);
    setYoutubeControlsEnabled(false);
    setVideoIndex(0);
  }

  function nextVideo() {
    if (!sessionActive || pauseSeconds > 0) return;
    if (videoIndex >= videos.length - 1) {
      void loadMoreAndAdvance();
      return;
    }

    advanceToVideo(videoIndex + 1);
  }

  function advanceToVideo(nextIndex: number, shouldPrefetch = true) {
    const elapsedOnVideo = currentVideoStartedAt.current ? (Date.now() - currentVideoStartedAt.current) / 1000 : 0;
    if (elapsedOnVideo < 7) setSkipCount((count) => count + 1);
    currentVideoStartedAt.current = Date.now();
    setVideoIndex(nextIndex);
    setVideosWatched((count) => count + 1);
    setNextClicks((count) => count + 1);
    setVideoPlaying(true);
    setYoutubeControlsEnabled(false);

    if (shouldPrefetch && videos.length - nextIndex <= 3) {
      void loadVideoBatch(true);
    }
  }

  async function loadMoreAndAdvance() {
    const added = await loadVideoBatch(true);
    if (added > 0) {
      advanceToVideo(videoIndex + 1, false);
    }
  }

  function advanceFromScroll() {
    if (!sessionActive || pauseSeconds > 0 || showWarning || postSessionOpen || youtubeControlsEnabled) return;
    const now = Date.now();
    if (now - lastScrollAdvanceAt.current < 780) return;
    lastScrollAdvanceAt.current = now;
    nextVideo();
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.deltaY > 36) {
      event.preventDefault();
      advanceFromScroll();
    }
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (touchStartY.current === null) return;
    const endY = event.changedTouches[0]?.clientY ?? touchStartY.current;
    const deltaY = touchStartY.current - endY;
    touchStartY.current = null;

    if (deltaY > 54) {
      advanceFromScroll();
    }
  }

  function onTouchCancel(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    touchStartY.current = null;
  }

  function startMindfulPause() {
    setMindfulPauseCount((count) => count + 1);
    setPauseSeconds(30);
    setVideoPlaying(false);
    if (showWarning) {
      setWarningDismissed(true);
    }
  }

  function continueIntentionally(fromWarning = false) {
    setVideoPlaying(true);
    if (fromWarning) {
      setContinuedAfterWarning(true);
      setWarningDismissed(true);
    }
  }

  function endSession() {
    persistCurrentSession({
      endedAt: new Date().toISOString(),
      exceededPlannedTime: durationSeconds / 60 > normalizedPlannedMinutes()
    });
    setSessionActive(false);
    setVideoPlaying(false);
    setPauseSeconds(0);
    setPostSessionOpen(true);
    setExceededPlanned(durationSeconds / 60 > normalizedPlannedMinutes());
  }

  function saveSession() {
    const startedAt = sessionStartedAt.current
      ? new Date(sessionStartedAt.current).toISOString()
      : new Date().toISOString();
    const safePlannedMinutes = normalizedPlannedMinutes();
    const sessionId = activeSessionId.current ?? createId("session");
    const session: VideoSession = {
      id: sessionId,
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
    activeSessionId.current = null;
    setPostSessionOpen(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Step 3 · Video session"
        title={
          <>
            Scroll with <em className="text-aurora pr-1 italic">awareness.</em>
          </>
        }
        description="Watch a public embeddable feed, then compare planned time, actual behavior, mood shift, and urge to continue."
        actions={
          <>
            <Badge variant={apiMode === "youtube" ? "success" : "warning"} dot>
              {apiMode === "youtube" ? "Live feed active" : "Demo feed active"}
            </Badge>
            {profile ? <Badge variant="outline">Profile: {profile.name}</Badge> : <Badge variant="outline">No profile yet</Badge>}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card variant="raised" className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid min-h-[calc(100svh-11rem)] lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="relative grid min-h-[64svh] place-items-center overflow-hidden overscroll-contain bg-black sm:min-h-[72svh]">
                {loading ? (
                  <div className="flex flex-col items-center gap-4 text-sm text-white/70" role="status">
                    <Scrolly mood="idle" size={96} />
                    Loading feed...
                  </div>
                ) : error ? (
                  <div className="max-w-md px-6 text-center text-sm text-[hsl(350_100%_84%)]" role="alert">{error}</div>
                ) : currentVideo ? (
                  <>
                    {sessionActive ? (
                      <>
                        <YouTubePlayer
                          key={currentVideo.id}
                          video={currentVideo}
                          muted={!soundEnabled}
                          playing={videoPlaying}
                          interactive={youtubeControlsEnabled}
                        />
                        {!youtubeControlsEnabled ? (
                          <div
                            className="absolute inset-0 z-10 cursor-ns-resize touch-none overscroll-contain bg-transparent"
                            aria-hidden="true"
                            onWheel={onWheel}
                            onTouchCancel={onTouchCancel}
                            onTouchEnd={onTouchEnd}
                            onTouchMove={onTouchMove}
                            onTouchStart={onTouchStart}
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="relative h-full min-h-[64svh] w-full overflow-hidden sm:min-h-[68svh]">
                        <div
                          className="h-full min-h-[64svh] w-full scale-105 bg-cover bg-center opacity-55 sm:min-h-[68svh]"
                          style={{ backgroundImage: `url("${currentVideo.thumbnail}")` }}
                          aria-hidden="true"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(287_39%_5%)] via-[hsl(287_39%_5%/0.55)] to-[hsl(287_39%_5%/0.15)]" />
                        <div className="absolute inset-0 grid place-items-center px-6 text-center text-white">
                          <div className="max-w-lg">
                            <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center">
                              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-[var(--metal-1)]" aria-hidden="true" />
                              <span className="grid h-20 w-20 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md">
                                <Play className="h-8 w-8 translate-x-0.5" aria-hidden="true" />
                              </span>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--metal-1)]">Ready when you are</p>
                            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight">{currentVideo.title}</h2>
                            <p className="mt-3 text-sm text-white/75">
                              Start the session, then scroll down or swipe up for the next video.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {pauseSeconds > 0 ? (
                      <div
                        role="dialog"
                        aria-label="Mindful pause"
                        className="absolute inset-0 z-30 grid place-items-center bg-[hsl(287_39%_4%/0.9)] px-6 text-center text-white"
                      >
                        <div className="flex flex-col items-center">
                          <Scrolly mood="breathing" size={150} />
                          <div className="mt-2 font-display text-6xl font-medium tabular-nums">{pauseSeconds}</div>
                          <p className="mt-3 max-w-xs text-sm text-white/75">Mindful pause. Breathe, blink, and decide intentionally.</p>
                        </div>
                      </div>
                    ) : null}
                    {showWarning ? (
                      <div className="absolute inset-0 z-30 grid place-items-center bg-[hsl(287_39%_4%/0.88)] px-4">
                        <div
                          role="alertdialog"
                          aria-labelledby="feed-warning-title"
                          aria-describedby="feed-warning-body"
                          className="surface surface--raised max-w-md p-6 text-center text-foreground"
                        >
                          <Scrolly mood="concerned" size={96} className="mx-auto" />
                          <h2 id="feed-warning-title" className="mt-3 font-display text-2xl font-medium tracking-tight">
                            Pause for a moment.
                          </h2>
                          <p id="feed-warning-body" className="mt-2 text-sm leading-6 text-muted-foreground">
                            Did you open this intentionally, or are you scrolling automatically?
                          </p>
                          <div className="mt-6 grid gap-2 sm:grid-cols-3">
                            <Button
                              size="sm"
                              autoFocus
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

              <div className="border-t border-foreground/10 bg-card/60 p-5 lg:border-l lg:border-t-0">
                <div className="space-y-5">
                  <div>
                    <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Now showing</div>
                    <div className="mt-1.5 line-clamp-3 font-display text-lg font-medium leading-snug tracking-tight">
                      {currentVideo?.title ?? "Waiting for video"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{currentVideo?.channelTitle}</div>
                  </div>

                  {!sessionActive && !postSessionOpen ? (
                    <div className="grid gap-4">
                      <Field label="Planned session minutes">
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={plannedMinutes}
                          onChange={(event) => setPlannedMinutes(event.target.value)}
                        />
                      </Field>
                      <Field label="Mood before">
                        <MoodSelect value={moodBefore} onChange={setMoodBefore} />
                      </Field>
                      <Field label="Reason for watching">
                        <Select value={reason} onChange={(event) => setReason(event.target.value as WatchReason)}>
                          {reasons.map((item) => <option key={item}>{item}</option>)}
                        </Select>
                      </Field>
                      <Button size="lg" onClick={startSession} disabled={loading || videos.length === 0}>
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Start session
                      </Button>
                    </div>
                  ) : null}

                  {sessionActive ? (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Planned" value={`${formatMinutes(plannedSessionMinutes)} min`} />
                        <Metric label="Duration" value={formatDuration(durationSeconds)} />
                      </div>
                      <Metric
                        label="Time remaining"
                        value={durationSeconds >= plannedSessionSeconds ? "Plan exceeded" : formatDuration(remainingSeconds)}
                        tone={durationSeconds >= plannedSessionSeconds ? "warning" : "default"}
                      />
                      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.035] p-3">
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>Planned progress</span>
                          <span className="tabular-nums">{plannedProgress}%</span>
                        </div>
                        <div
                          className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10"
                          role="progressbar"
                          aria-label="Planned progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={plannedProgress}
                        >
                          <div
                            className="h-full w-full origin-left rounded-full bg-metal transition-transform duration-1000 ease-linear"
                            style={{ transform: `scaleX(${Math.min(100, Math.max(0, plannedProgress)) / 100})` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Watched" value={String(videosWatched)} />
                        <Metric label="Queued" value={String(Math.max(0, videos.length - videoIndex - 1))} />
                        <Metric label="Skips" value={String(skipCount)} />
                        <Metric label="Avg / video" value={`${averageTimePerVideo}s`} />
                      </div>
                      <div className="rounded-2xl border border-primary/25 bg-primary/[0.08] p-3 text-sm leading-6 text-foreground/90">
                        {youtubeControlsEnabled
                          ? "YouTube controls are active. Turn them off to restore scroll/swipe over the video."
                          : "Scroll down or swipe up over the video to advance. Turn on YouTube controls only when you need the iframe buttons."}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={videoPlaying ? "secondary" : "outline"}
                          onClick={() => setVideoPlaying((playing) => !playing)}
                          disabled={pauseSeconds > 0}
                        >
                          {videoPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                          {videoPlaying ? "Pause" : "Play"}
                        </Button>
                        <Button
                          variant={soundEnabled ? "secondary" : "outline"}
                          onClick={() => {
                            setSoundEnabled((enabled) => !enabled);
                            setVideoPlaying(true);
                          }}
                        >
                          {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                          {soundEnabled ? "Sound on" : "Sound off"}
                        </Button>
                      </div>
                      <Button onClick={nextVideo} disabled={pauseSeconds > 0 || loadingMore}>
                        <StepForward className="h-4 w-4" aria-hidden="true" />
                        {loadingMore ? "Loading more..." : "Next video"}
                      </Button>
                      <Button
                        variant={youtubeControlsEnabled ? "secondary" : "outline"}
                        onClick={() => setYoutubeControlsEnabled((enabled) => !enabled)}
                      >
                        {youtubeControlsEnabled ? "Scroll mode" : "YouTube controls"}
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
                    <div className="grid gap-4">
                      <Metric label="Final duration" value={formatDuration(durationSeconds)} />
                      <Field label="Mood after">
                        <MoodSelect value={moodAfter} onChange={setMoodAfter} />
                      </Field>
                      <Field label="Do you feel like continuing?" hint={`${urge}/10`}>
                        <Slider min={1} max={10} value={urge} onChange={(event) => setUrge(Number(event.target.value))} />
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
              <CardDescription>
                {apiMessage}
                {lastFeedRefresh ? ` Last refresh: ${new Date(lastFeedRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              New unique videos are added automatically every 2 minutes during an active session. The feed uses public embedded videos when available and falls back to demo videos when the live source cannot be reached.
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

function MoodSelect({
  value,
  onChange,
  ...props
}: { value: Mood; onChange: (value: Mood) => void } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <Select {...props} value={value} onChange={(event) => onChange(event.target.value as Mood)}>
      {moods.map((mood) => <option key={mood}>{mood}</option>)}
    </Select>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "default" | "warning" }) {
  return <Stat compact label={label} value={value} tone={tone} />;
}

function formatMinutes(minutes: number) {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(2);
}

function shuffleVideos(videos: VideoItem[]) {
  return [...videos].sort(() => Math.random() - 0.5);
}
