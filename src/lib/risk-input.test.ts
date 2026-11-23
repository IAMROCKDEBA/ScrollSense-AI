import { describe, expect, it } from "vitest";
import type { UserProfile, VideoSession } from "@/types";
import { buildRiskInput, computeTrend, scorableSessions } from "./risk-input";

function session(overrides: Partial<VideoSession> & { id: string }): VideoSession {
  return {
    plannedMinutes: 10,
    startedAt: "2026-01-01T10:00:00.000Z",
    durationSeconds: 600,
    videosWatched: 20,
    skipCount: 5,
    nextClicks: 20,
    averageTimePerVideo: 30,
    continuedAfterWarning: false,
    mindfulPauseCount: 0,
    urgeToContinueScore: 4,
    completed: true,
    ...overrides
  };
}

const profile: UserProfile = {
  name: "T",
  age: 20,
  studentStatus: "college",
  dailyUsageMinutes: 90,
  mainPlatform: "YouTube Shorts",
  studyHours: 3,
  sleepHours: 7,
  lateNightUsage: "Sometimes",
  losesTrackOfTime: "Often",
  unintentionalOpening: "Rarely",
  createdAt: "2026-01-01T00:00:00.000Z"
};

describe("buildRiskInput", () => {
  it("leaves unmeasured inputs undefined (no invented defaults)", () => {
    const input = buildRiskInput(null, [], null, []);
    expect(input.dailyUsageMinutes).toBeUndefined();
    expect(input.sleepHours).toBeUndefined();
    expect(input.urgeToContinueScore).toBeUndefined();
    expect(input.reactionTime).toBeUndefined();
    expect(input.sessionDuration).toBeUndefined();
  });

  it("ignores unfinished and tiny sessions", () => {
    const sessions = [
      session({ id: "a", completed: false }),
      session({ id: "b", durationSeconds: 5 }),
      session({ id: "c" })
    ];
    expect(scorableSessions(sessions).map((item) => item.id)).toEqual(["c"]);
  });

  it("weights recent sessions more heavily", () => {
    const sessions = [
      session({ id: "old", durationSeconds: 3000 }),
      session({ id: "mid", durationSeconds: 600 }),
      session({ id: "new", durationSeconds: 300 })
    ];
    const input = buildRiskInput(profile, sessions, null, []);
    const plainMean = (3000 + 600 + 300) / 3;
    expect(input.sessionDuration).toBeLessThan(plainMean);
    expect(input.sessionsUsed).toBe(3);
  });

  it("derives swipe speed and skip rate from real telemetry", () => {
    const input = buildRiskInput(profile, [session({ id: "x", durationSeconds: 300, videosWatched: 30, skipCount: 15 })], null, []);
    expect(input.videosPerMinute).toBeCloseTo(6, 5);
    expect(input.skipRate).toBeCloseTo(0.5, 5);
  });
});

describe("computeTrend", () => {
  it("needs at least three sessions", () => {
    expect(computeTrend([session({ id: "a" }), session({ id: "b" })])).toBeUndefined();
  });

  it("detects improving and worsening intensity", () => {
    const improving = [9, 7, 5, 3].map((urge, i) => session({ id: `i${i}`, urgeToContinueScore: urge }));
    const worsening = [2, 4, 6, 8].map((urge, i) => session({ id: `w${i}`, urgeToContinueScore: urge }));
    expect(computeTrend(improving)?.direction).toBe("improving");
    expect(computeTrend(worsening)?.direction).toBe("worsening");
  });
});
