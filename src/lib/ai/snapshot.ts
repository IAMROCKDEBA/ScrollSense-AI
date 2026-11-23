import type {
  CognitiveResult,
  Commitment,
  MoodLog,
  RiskInput,
  RiskScore,
  StudentStatus,
  UserProfile,
  VideoSession
} from "@/types";
import { buildRiskInput } from "@/lib/risk-input";
import { predictRisk } from "@/lib/risk-engine";
import { summarizeViews } from "@/lib/telemetry/session-recorder";
import type { SessionSnapshot, Snapshot } from "./schemas";

export interface SnapshotSource {
  profile: UserProfile | null;
  sessions: VideoSession[];
  moodLogs: MoodLog[];
  cognitiveResult: CognitiveResult | null;
  dailyLimitMinutes: number | null;
  commitments: Commitment[];
  demoPersona: boolean;
}

const MAX_SESSIONS = 14;

export function toSessionSnapshot(session: VideoSession): SessionSnapshot {
  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    completed: session.completed,
    goal: session.goal,
    durationSeconds: session.durationSeconds,
    plannedMinutes: session.plannedMinutes,
    videosWatched: session.videosWatched,
    skipCount: session.skipCount,
    nextClicks: session.nextClicks ?? 0,
    averageTimePerVideo: session.averageTimePerVideo ?? 0,
    continuedAfterWarning: session.continuedAfterWarning ?? false,
    mindfulPauseCount: session.mindfulPauseCount ?? 0,
    urgeToContinueScore: session.urgeToContinueScore,
    moodBefore: session.moodBefore,
    moodAfter: session.moodAfter,
    reason: session.reason,
    exceededPlannedTime: session.exceededPlannedTime,
    focusAfter: session.focusAfter,
    likes: session.likes,
    peakCompulsion: session.peakCompulsion,
    guardianEvents: session.guardianEvents?.slice(-10).map((event) => ({
      severity: event.severity,
      headline: event.headline,
      action: event.action,
      response: event.response
    })),
    summary: session.views?.length ? summarizeViews(session.views, session.durationSeconds * 1000) : undefined
  };
}

/** Compact, size-capped snapshot of the user's local data, safe to send to the server. */
export function buildSnapshot(source: SnapshotSource): Snapshot {
  const { profile } = source;
  return {
    profile: profile
      ? {
          name: profile.name,
          age: profile.age,
          studentStatus: profile.studentStatus,
          dailyUsageMinutes: profile.dailyUsageMinutes,
          mainPlatform: profile.mainPlatform,
          studyHours: profile.studyHours,
          sleepHours: profile.sleepHours,
          lateNightUsage: profile.lateNightUsage,
          losesTrackOfTime: profile.losesTrackOfTime,
          unintentionalOpening: profile.unintentionalOpening
        }
      : null,
    sessions: source.sessions.slice(-MAX_SESSIONS).map(toSessionSnapshot),
    moodLogs: source.moodLogs.slice(-20).map((log) => ({
      id: log.id,
      moodBefore: log.moodBefore,
      moodAfter: log.moodAfter,
      reason: log.reason,
      urgeToContinueScore: log.urgeToContinueScore,
      exceededPlannedTime: log.exceededPlannedTime,
      createdAt: log.createdAt
    })),
    cognitive: source.cognitiveResult
      ? {
          reactionTimeMs: source.cognitiveResult.reactionTimeMs,
          reactionEarlyClicks: source.cognitiveResult.reactionEarlyClicks,
          memoryScore: source.cognitiveResult.memoryScore,
          memoryWordsRemembered: source.cognitiveResult.memoryWordsRemembered,
          stroopScore: source.cognitiveResult.stroopScore,
          stroopAccuracy: source.cognitiveResult.stroopAccuracy,
          stroopAverageMs: source.cognitiveResult.stroopAverageMs,
          updatedAt: source.cognitiveResult.updatedAt
        }
      : null,
    dailyLimitMinutes: source.dailyLimitMinutes,
    commitments: source.commitments.slice(-10).map((item) => ({ text: item.text, done: item.done })),
    demoPersona: source.demoPersona
  };
}

export interface DomainData {
  profile: UserProfile | null;
  sessions: VideoSession[];
  moodLogs: MoodLog[];
  cognitive: CognitiveResult | null;
}

/** Rebuild the domain objects the risk engine understands from a validated snapshot. */
export function snapshotToDomain(snapshot: Snapshot): DomainData {
  const profile: UserProfile | null = snapshot.profile
    ? {
        name: snapshot.profile.name ?? "Student",
        age: snapshot.profile.age ?? 20,
        studentStatus: (snapshot.profile.studentStatus as StudentStatus) ?? "college",
        dailyUsageMinutes: snapshot.profile.dailyUsageMinutes,
        mainPlatform: (snapshot.profile.mainPlatform as UserProfile["mainPlatform"]) ?? "Other",
        studyHours: snapshot.profile.studyHours,
        sleepHours: snapshot.profile.sleepHours,
        lateNightUsage: snapshot.profile.lateNightUsage,
        losesTrackOfTime: snapshot.profile.losesTrackOfTime,
        unintentionalOpening: snapshot.profile.unintentionalOpening,
        createdAt: ""
      }
    : null;

  const sessions: VideoSession[] = snapshot.sessions.map((session) => ({
    ...session,
    guardianEvents: session.guardianEvents?.map((event) => ({
      at: "",
      compulsion: 0,
      severity: event.severity ?? "gentle",
      headline: event.headline ?? "",
      message: "",
      evidence: [],
      action: (event.action as NonNullable<VideoSession["guardianEvents"]>[number]["action"]) ?? "continue_calm_feed",
      source: "offline" as const,
      response: event.response
    }))
  }));

  const moodLogs: MoodLog[] = snapshot.moodLogs;
  return { profile, sessions, moodLogs, cognitive: snapshot.cognitive };
}

export function inputFromSnapshot(snapshot: Snapshot): RiskInput {
  const domain = snapshotToDomain(snapshot);
  return buildRiskInput(domain.profile, domain.sessions, domain.cognitive, domain.moodLogs);
}

export function riskFromSnapshot(snapshot: Snapshot): RiskScore {
  return predictRisk(inputFromSnapshot(snapshot));
}
