import type { CognitiveResult, MoodLog, RiskInput, RiskTrend, UserProfile, VideoSession } from "@/types";
import { clamp, frequencyToScore, moodValence, round } from "@/lib/utils";
import { slope } from "@/lib/telemetry/session-recorder";

/** How many recent completed sessions feed the behavioural signals. */
export const SESSION_WINDOW = 7;
/** Each older session counts this much less than the one after it. */
export const RECENCY_DECAY = 0.75;

interface Weighted {
  value: number;
  weight: number;
}

function weightedMean(items: Weighted[]): number | undefined {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (items.length === 0 || total === 0) return undefined;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / total;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Sessions that finished and carry real signal (abandoned or still-running ones are ignored). */
export function scorableSessions(sessions: VideoSession[]) {
  return sessions.filter((session) => session.completed !== false && finite(session.durationSeconds) && session.durationSeconds >= 20);
}

/** Per-session "intensity" 0-100 used only for the trend line. */
export function sessionIntensity(session: VideoSession): number {
  const urge = finite(session.urgeToContinueScore) && session.urgeToContinueScore > 0 ? session.urgeToContinueScore * 10 : undefined;
  const peak = finite(session.peakCompulsion) ? session.peakCompulsion : undefined;
  const parts = [urge, peak].filter(finite);
  if (parts.length === 0) return clamp(session.durationSeconds / 60 / (Math.max(1, session.plannedMinutes) * 1.5) * 100);
  return parts.reduce((sum, value) => sum + value, 0) / parts.length;
}

export function computeTrend(sessions: VideoSession[]): RiskTrend | undefined {
  const recent = sessions.slice(-SESSION_WINDOW);
  if (recent.length < 3) return undefined;
  const intensities = recent.map(sessionIntensity);
  const perSession = slope(intensities);
  const delta = round(perSession * (recent.length - 1), 1);
  return {
    direction: perSession <= -2 ? "improving" : perSession >= 2 ? "worsening" : "stable",
    delta,
    sessions: recent.length
  };
}

/**
 * Turn raw store data into model inputs. Anything not actually measured stays `undefined`
 * so the risk engine can exclude it instead of silently assuming a value.
 */
export function buildRiskInput(
  profile: UserProfile | null,
  sessions: VideoSession[],
  cognitiveResult: CognitiveResult | null,
  moodLogs: MoodLog[]
): RiskInput {
  const usable = scorableSessions(sessions).slice(-SESSION_WINDOW);
  const weighted = (pick: (session: VideoSession) => number | undefined) =>
    weightedMean(
      usable.flatMap((session, index) => {
        const value = pick(session);
        return finite(value) ? [{ value, weight: RECENCY_DECAY ** (usable.length - 1 - index) }] : [];
      })
    );

  const latestMood = moodLogs.at(-1);
  const moodDrop = weighted((session) =>
    session.moodBefore && session.moodAfter
      ? Math.max(0, moodValence(session.moodBefore) - moodValence(session.moodAfter))
      : undefined
  );
  const fallbackMoodDrop =
    latestMood?.moodBefore && latestMood.moodAfter
      ? Math.max(0, moodValence(latestMood.moodBefore) - moodValence(latestMood.moodAfter))
      : undefined;

  const warned = usable.filter((session) => (session.guardianEvents?.length ?? 0) > 0);
  const warningIgnoredRate = warned.length
    ? warned.reduce(
        (sum, session) =>
          sum + (session.guardianEvents ?? []).filter((event) => event.response === "dismissed").length /
          Math.max(1, session.guardianEvents?.length ?? 1),
        0
      ) / warned.length
    : usable.length
      ? weighted((session) => (session.continuedAfterWarning ? 1 : 0))
      : undefined;

  const urge = weighted((session) => (session.urgeToContinueScore > 0 ? session.urgeToContinueScore : undefined));

  return {
    dailyUsageMinutes: profile?.dailyUsageMinutes,
    lateNightUsageScore: profile ? frequencyToScore(profile.lateNightUsage) : undefined,
    losesTrackOfTimeScore: profile ? frequencyToScore(profile.losesTrackOfTime) : undefined,
    unintentionalOpeningScore: profile ? frequencyToScore(profile.unintentionalOpening) : undefined,
    studyHours: profile?.studyHours,
    sleepHours: profile?.sleepHours,

    plannedVsActualGap: weighted((session) => Math.max(0, session.durationSeconds / 60 - session.plannedMinutes)),
    sessionDuration: weighted((session) => session.durationSeconds),
    videosPerMinute: weighted((session) =>
      session.durationSeconds > 0 ? session.videosWatched / (session.durationSeconds / 60) : undefined
    ),
    skipRate: weighted((session) => (session.videosWatched > 0 ? session.skipCount / session.videosWatched : undefined)),
    peakCompulsion: weighted((session) => (finite(session.peakCompulsion) ? session.peakCompulsion : undefined)),
    warningIgnoredRate,
    urgeToContinueScore: urge ?? (finite(latestMood?.urgeToContinueScore) && latestMood.urgeToContinueScore > 0 ? latestMood.urgeToContinueScore : undefined),
    moodDropScore: moodDrop ?? fallbackMoodDrop,

    reactionTime: cognitiveResult?.reactionTimeMs,
    memoryScore: cognitiveResult?.memoryScore,
    stroopScore: cognitiveResult?.stroopScore,

    sessionsUsed: usable.length,
    trend: computeTrend(usable)
  };
}
