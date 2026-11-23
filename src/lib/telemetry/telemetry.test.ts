import { describe, expect, it } from "vitest";
import type { VideoItem, ViewEvent } from "@/types";
import { computeCompulsion, levelFor } from "./compulsion";
import { ReelTracker, slope, summarizeViews, trailingSkipStreak } from "./session-recorder";

const video: VideoItem = { id: "abcdefghijk", title: "t", channelTitle: "c", thumbnail: "", durationSec: 20 };

function view(index: number, dwellSec: number, overrides: Partial<ViewEvent> = {}): ViewEvent {
  return {
    videoId: `v${index}`,
    title: `v${index}`,
    index,
    startedAtMs: index * 1000,
    dwellMs: dwellSec * 1000,
    watchedMs: dwellSec * 1000,
    durationSec: 20,
    completion: Math.min(1, dwellSec / 20),
    loops: 0,
    skippedEarly: dwellSec < 3,
    liked: false,
    soundOn: false,
    ...overrides
  };
}

describe("ReelTracker", () => {
  it("accumulates only playing time and flags early skips", () => {
    const tracker = new ReelTracker();
    tracker.begin(video, 0, 0, false);
    tracker.setPlaying(true, 500);
    tracker.setPlaying(false, 2000);
    const event = tracker.end(2500);
    expect(event?.dwellMs).toBe(2500);
    expect(event?.watchedMs).toBe(1500);
    expect(event?.skippedEarly).toBe(true);
  });

  it("closes a running play interval on end and caps completion at 1", () => {
    const tracker = new ReelTracker();
    tracker.begin(video, 3, 0, true);
    tracker.setPlaying(true, 0);
    tracker.addLoop();
    tracker.setLiked(true);
    const event = tracker.end(40_000);
    expect(event?.watchedMs).toBe(40_000);
    expect(event?.completion).toBe(1);
    expect(event?.loops).toBe(1);
    expect(event?.liked).toBe(true);
    expect(event?.soundOn).toBe(true);
    expect(tracker.end(50_000)).toBeNull();
  });

  it("drops sub-300ms mount/unmount noise instead of counting it as a skip", () => {
    const tracker = new ReelTracker();
    tracker.begin(video, 0, 1000, false);
    expect(tracker.end(1100)).toBeNull();
  });

  it("excludes suspended (paused / overlay) time from dwell", () => {
    const tracker = new ReelTracker();
    tracker.begin(video, 0, 0, false);
    tracker.setSuspended(true, 2000);
    tracker.setSuspended(false, 12_000);
    const event = tracker.end(15_000);
    expect(event?.dwellMs).toBe(5000);
    // A pause still running when the reel ends is excluded too.
    tracker.begin(video, 1, 20_000, false);
    tracker.setSuspended(true, 21_000);
    expect(tracker.end(60_000)?.dwellMs).toBe(1000);
  });

  it("never reports more watch time than dwell time", () => {
    const tracker = new ReelTracker();
    tracker.begin(video, 0, 1000, false);
    tracker.setPlaying(true, 0);
    expect(tracker.end(2000)?.watchedMs).toBeLessThanOrEqual(1000);
  });
});

describe("summaries", () => {
  it("detects decaying attention with a negative slope", () => {
    const views = Array.from({ length: 10 }, (_, i) => view(i, 20 - i * 1.8));
    expect(summarizeViews(views, 120_000).dwellSlopePerVideo).toBeLessThan(0);
    expect(slope([1, 2])).toBe(0);
  });

  it("counts the trailing skip streak only", () => {
    const views = [view(0, 1), view(1, 12), view(2, 1), view(3, 2), view(4, 1)];
    expect(trailingSkipStreak(views)).toBe(3);
    expect(summarizeViews(views, 60_000).longestSkipStreak).toBe(3);
  });
});

describe("computeCompulsion", () => {
  const base = { plannedMinutes: 10, hour: 15 };

  it("stays calm for a relaxed session", () => {
    const views = Array.from({ length: 6 }, (_, i) => view(i, 18));
    const reading = computeCompulsion({ ...base, views, elapsedSec: 200 });
    expect(reading.level).toBe("calm");
    expect(reading.index).toBeLessThan(35);
  });

  it("flags a rapid-fire, late-night, over-plan session as compulsive", () => {
    const views = [...Array.from({ length: 6 }, (_, i) => view(i, 14)), ...Array.from({ length: 8 }, (_, i) => view(6 + i, 1.5))];
    const reading = computeCompulsion({ views, elapsedSec: 900, plannedMinutes: 10, hour: 1, moodBefore: "Anxious" });
    expect(reading.level).toBe("compulsive");
    expect(reading.evidence.length).toBeGreaterThan(0);
  });

  it("is monotonic in swipe speed", () => {
    const slow = computeCompulsion({ ...base, views: Array.from({ length: 6 }, (_, i) => view(i, 15)), elapsedSec: 300 });
    const fast = computeCompulsion({ ...base, views: Array.from({ length: 6 }, (_, i) => view(i, 4)), elapsedSec: 300 });
    expect(fast.index).toBeGreaterThan(slow.index);
  });

  it("is bounded 0-100 and maps levels", () => {
    expect(levelFor(0)).toBe("calm");
    expect(levelFor(40)).toBe("drifting");
    expect(levelFor(80)).toBe("compulsive");
    const reading = computeCompulsion({ ...base, views: [], elapsedSec: 0 });
    expect(reading.index).toBe(0);
  });
});
