import type { Snapshot } from "./schemas";

/** Shared test fixture: a realistic mid-risk student with four completed sessions. */
export function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  const session = (i: number, urge: number, peak: number, minutes: number) => ({
    id: `s${i}`,
    startedAt: `2026-03-0${i}T21:00:00.000Z`,
    completed: true,
    goal: i === 4 ? "calm down then learn something" : undefined,
    durationSeconds: minutes * 60,
    plannedMinutes: 10,
    videosWatched: minutes * 3,
    skipCount: minutes,
    nextClicks: minutes * 3,
    averageTimePerVideo: 20,
    continuedAfterWarning: i % 2 === 0,
    mindfulPauseCount: 0,
    urgeToContinueScore: urge,
    moodBefore: "Stressed" as const,
    moodAfter: i === 4 ? ("Neutral" as const) : ("Anxious" as const),
    peakCompulsion: peak,
    likes: 2,
    guardianEvents: [{ severity: "gentle" as const, headline: "Quick check-in", action: "continue_calm_feed", response: "dismissed" as const }]
  });

  return {
    profile: {
      name: "Asha",
      age: 20,
      studentStatus: "college",
      dailyUsageMinutes: 150,
      mainPlatform: "YouTube Shorts",
      studyHours: 2,
      sleepHours: 5.5,
      lateNightUsage: "Often",
      losesTrackOfTime: "Often",
      unintentionalOpening: "Sometimes"
    },
    sessions: [session(1, 8, 72, 25), session(2, 7, 66, 20), session(3, 6, 58, 16), session(4, 4, 40, 11)],
    moodLogs: [],
    cognitive: { reactionTimeMs: 410, memoryScore: 60, stroopScore: 70 },
    dailyLimitMinutes: null,
    commitments: [],
    demoPersona: false,
    ...overrides
  };
}
