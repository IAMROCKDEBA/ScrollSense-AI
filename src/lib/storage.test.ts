import { describe, expect, it } from "vitest";
import type { VideoSession, ViewEvent } from "@/types";
import { compactForStorage, defaultStoredData, migrateSessions, sanitizeStoredData } from "./storage";

const view: ViewEvent = { videoId: "abcdefghijk", title: "t", index: 0, startedAtMs: 0, dwellMs: 5000, watchedMs: 4000, durationSec: 20, completion: 0.2, loops: 0, skippedEarly: false, liked: false, soundOn: false };

function session(id: string, extra: Partial<VideoSession> = {}): VideoSession {
  return { id, plannedMinutes: 10, startedAt: "2026-01-01T10:00:00.000Z", durationSeconds: 600, videosWatched: 5, skipCount: 1, nextClicks: 5, averageTimePerVideo: 20, continuedAfterWarning: false, mindfulPauseCount: 0, urgeToContinueScore: 5, ...extra };
}

describe("storage v1 -> v2 migration", () => {
  it("marks ended v1 sessions completed and drops stale abandoned ones", () => {
    const now = Date.parse("2026-01-10T00:00:00.000Z");
    const migrated = migrateSessions([session("ended", { endedAt: "2026-01-01T10:10:00.000Z" }), session("abandoned")], now);
    expect(migrated.map((item) => item.id)).toEqual(["ended"]);
    expect(migrated[0].completed).toBe(true);
  });

  it("keeps a recently started unfinished session", () => {
    const started = new Date(Date.now() - 60_000).toISOString();
    expect(migrateSessions([session("live", { startedAt: started })])).toHaveLength(1);
  });

  it("sanitises a v1 snapshot into a valid v2 object", () => {
    const result = sanitizeStoredData({ profile: null, moodLogs: [], sessions: [session("a", { endedAt: "x" })], demoMode: true });
    expect(result.version).toBe(2);
    expect(result.commitments).toEqual([]);
    expect(result.dailyLimitMinutes).toBeNull();
    expect(result.demoMode).toBe(true);
  });

  it("returns defaults for garbage", () => {
    expect(sanitizeStoredData("nope")).toEqual(defaultStoredData);
  });
});

describe("compactForStorage", () => {
  it("strips per-video telemetry from all but the most recent sessions", () => {
    const sessions = Array.from({ length: 14 }, (_, i) => session(`s${i}`, { views: [view] }));
    const compact = compactForStorage({ ...defaultStoredData, sessions }, 10);
    expect(compact.sessions.filter((item) => item.views).length).toBe(10);
    expect(compact.sessions[0].views).toBeUndefined();
    expect(compact.sessions[13].views).toBeDefined();
  });
});
