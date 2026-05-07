import type { CognitiveResult, MoodLog, RiskInput, UserProfile, VideoSession } from "@/types";
import { frequencyToScore, moodValence } from "@/lib/utils";

export function buildRiskInput(
  profile: UserProfile | null,
  sessions: VideoSession[],
  cognitiveResult: CognitiveResult | null,
  moodLogs: MoodLog[]
): RiskInput {
  const latestSession = sessions.at(-1);
  const latestMood = moodLogs.at(-1);
  const plannedMinutes = Number.isFinite(latestSession?.plannedMinutes)
    ? Number(latestSession?.plannedMinutes)
    : 0;
  const durationSeconds = Number.isFinite(latestSession?.durationSeconds)
    ? Number(latestSession?.durationSeconds)
    : 0;
  const videosWatched = Number.isFinite(latestSession?.videosWatched)
    ? Number(latestSession?.videosWatched)
    : 0;
  const skipCount = Number.isFinite(latestSession?.skipCount) ? Number(latestSession?.skipCount) : 0;
  const actualMinutes = durationSeconds / 60;
  const moodBefore = latestSession?.moodBefore ?? latestMood?.moodBefore;
  const moodAfter = latestSession?.moodAfter ?? latestMood?.moodAfter;

  return {
    dailyUsageMinutes: profile?.dailyUsageMinutes ?? 0,
    lateNightUsageScore: frequencyToScore(profile?.lateNightUsage),
    losesTrackOfTimeScore: frequencyToScore(profile?.losesTrackOfTime),
    unintentionalOpeningScore: frequencyToScore(profile?.unintentionalOpening),
    plannedVsActualGap: Math.max(0, actualMinutes - plannedMinutes),
    sessionDuration: durationSeconds,
    videosWatched,
    skipRate: videosWatched ? skipCount / Math.max(1, videosWatched) : 0,
    urgeToContinueScore: latestSession?.urgeToContinueScore ?? latestMood?.urgeToContinueScore ?? 0,
    moodDropScore: Math.max(0, moodValence(moodBefore) - moodValence(moodAfter)),
    studyHours: profile?.studyHours ?? 3,
    sleepHours: profile?.sleepHours ?? 8,
    reactionTime: cognitiveResult?.reactionTimeMs,
    memoryScore: cognitiveResult?.memoryScore,
    stroopScore: cognitiveResult?.stroopScore,
    continuedAfterWarning: latestSession?.continuedAfterWarning ?? false
  };
}
