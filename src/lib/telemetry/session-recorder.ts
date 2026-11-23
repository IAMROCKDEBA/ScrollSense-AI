import type { VideoItem, ViewEvent } from "@/types";

/** A reel left within this window counts as an early skip. */
export const EARLY_SKIP_MS = 3000;
/** Reels closed faster than this are mount/unmount noise (e.g. React StrictMode), not real views. */
export const MIN_VIEW_MS = 300;

interface ActiveReel {
  video: VideoItem;
  index: number;
  startedAtMs: number;
  playingSince: number | null;
  /** Time the reel was held back (Guardian sheet, breathing break, user pause, hidden tab): not attention. */
  suspendedSince: number | null;
  suspendedMs: number;
  watchedMs: number;
  loops: number;
  liked: boolean;
  soundOn: boolean;
  durationSec: number;
}

/**
 * Records real behaviour for one reel at a time. Time source is injected so the
 * logic is deterministic under test; the feed passes `Date.now()`.
 */
export class ReelTracker {
  private active: ActiveReel | null = null;

  begin(video: VideoItem, index: number, now: number, soundOn: boolean) {
    this.active = {
      video,
      index,
      startedAtMs: now,
      playingSince: null,
      suspendedSince: null,
      suspendedMs: 0,
      watchedMs: 0,
      loops: 0,
      liked: false,
      soundOn,
      durationSec: video.durationSec && video.durationSec > 0 ? video.durationSec : 30
    };
  }

  get current() {
    return this.active;
  }

  setPlaying(playing: boolean, now: number) {
    const reel = this.active;
    if (!reel) return;
    if (playing && reel.playingSince === null) reel.playingSince = now;
    if (!playing && reel.playingSince !== null) {
      reel.watchedMs += Math.max(0, now - reel.playingSince);
      reel.playingSince = null;
    }
  }

  /** Mark the reel as externally paused. Suspended time is excluded from dwell so pauses never look like engagement. */
  setSuspended(suspended: boolean, now: number) {
    const reel = this.active;
    if (!reel) return;
    if (suspended && reel.suspendedSince === null) reel.suspendedSince = now;
    if (!suspended && reel.suspendedSince !== null) {
      reel.suspendedMs += Math.max(0, now - reel.suspendedSince);
      reel.suspendedSince = null;
    }
  }

  addLoop() {
    if (this.active) this.active.loops += 1;
  }

  setLiked(liked: boolean) {
    if (this.active) this.active.liked = liked;
  }

  setSound(soundOn: boolean) {
    if (this.active) this.active.soundOn = soundOn;
  }

  setDuration(seconds: number) {
    if (this.active && Number.isFinite(seconds) && seconds > 0) this.active.durationSec = seconds;
  }

  /** Watch time so far including a running play interval (for the live Attention Pulse). */
  watchedSoFarMs(now: number) {
    const reel = this.active;
    if (!reel) return 0;
    return reel.watchedMs + (reel.playingSince !== null ? Math.max(0, now - reel.playingSince) : 0);
  }

  end(now: number): ViewEvent | null {
    const reel = this.active;
    if (!reel) return null;
    this.setPlaying(false, now);
    this.setSuspended(false, now);
    this.active = null;
    const dwellMs = Math.max(0, now - reel.startedAtMs - reel.suspendedMs);
    if (dwellMs < MIN_VIEW_MS) return null;
    const watchedMs = Math.min(reel.watchedMs, dwellMs);
    return {
      videoId: reel.video.id,
      title: reel.video.title,
      topic: reel.video.topic,
      index: reel.index,
      startedAtMs: reel.startedAtMs,
      dwellMs,
      watchedMs,
      durationSec: reel.durationSec,
      completion: Math.min(1, watchedMs / 1000 / Math.max(1, reel.durationSec)),
      loops: reel.loops,
      skippedEarly: dwellMs < EARLY_SKIP_MS,
      liked: reel.liked,
      soundOn: reel.soundOn
    };
  }
}

export interface ViewSummary {
  videos: number;
  videosPerMinute: number;
  skipRate: number;
  avgDwellSec: number;
  avgCompletion: number;
  likes: number;
  rewatches: number;
  longestSkipStreak: number;
  /** Seconds-per-video change across the session (negative = attention decaying). */
  dwellSlopePerVideo: number;
  firstHalfDwellSec: number;
  secondHalfDwellSec: number;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** Least-squares slope of y over x = 0..n-1. */
export function slope(values: number[]) {
  const n = values.length;
  if (n < 3) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function longestSkipStreak(views: ViewEvent[]) {
  let best = 0;
  let run = 0;
  for (const view of views) {
    run = view.skippedEarly ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function trailingSkipStreak(views: ViewEvent[]) {
  let run = 0;
  for (let i = views.length - 1; i >= 0; i -= 1) {
    if (!views[i].skippedEarly) break;
    run += 1;
  }
  return run;
}

export function summarizeViews(views: ViewEvent[], elapsedMs: number): ViewSummary {
  const dwellSec = views.map((view) => view.dwellMs / 1000);
  const half = Math.floor(views.length / 2);
  return {
    videos: views.length,
    videosPerMinute: elapsedMs > 0 ? views.length / (elapsedMs / 60000) : 0,
    skipRate: views.length ? views.filter((view) => view.skippedEarly).length / views.length : 0,
    avgDwellSec: mean(dwellSec),
    avgCompletion: mean(views.map((view) => view.completion)),
    likes: views.filter((view) => view.liked).length,
    rewatches: views.reduce((sum, view) => sum + view.loops, 0),
    longestSkipStreak: longestSkipStreak(views),
    dwellSlopePerVideo: slope(dwellSec),
    firstHalfDwellSec: mean(dwellSec.slice(0, Math.max(1, half))),
    secondHalfDwellSec: mean(dwellSec.slice(half))
  };
}
