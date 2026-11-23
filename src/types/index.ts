export type Frequency = "Never" | "Rarely" | "Sometimes" | "Often" | "Always";

export type StudentStatus = "school" | "college" | "university" | "other";

export type MainPlatform =
  | "YouTube Shorts"
  | "Instagram Reels"
  | "TikTok"
  | "Facebook Reels"
  | "Other";

export type Mood =
  | "Happy"
  | "Bored"
  | "Stressed"
  | "Anxious"
  | "Lonely"
  | "Tired"
  | "Procrastinating"
  | "Neutral";

export type WatchReason =
  | "Entertainment"
  | "Boredom"
  | "Stress relief"
  | "Habit"
  | "Procrastination"
  | "Learning"
  | "Motivation";

export type FocusAfter = "More focused" | "Same" | "Less focused";

export type RiskCategory = "Low" | "Moderate" | "High" | "Critical";

export interface UserProfile {
  name: string;
  age: number;
  studentStatus: StudentStatus;
  dailyUsageMinutes: number;
  mainPlatform: MainPlatform;
  studyHours: number;
  sleepHours: number;
  lateNightUsage: Frequency;
  losesTrackOfTime: Frequency;
  unintentionalOpening: Frequency;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  /** Duration in seconds when known (Shorts are <= 60). */
  durationSec?: number;
  /** Topic / query that produced this video (shown in "why this video?"). */
  topic?: string;
}

export interface ShortsResponse {
  mode: "youtube" | "seed";
  videos: VideoItem[];
  message?: string;
  queries: string[];
  fetchedAt: string;
}

/** One video's worth of real behavioural telemetry captured by the Reels feed. */
export interface ViewEvent {
  videoId: string;
  title: string;
  topic?: string;
  /** Position in the session (0-based). */
  index: number;
  /** Epoch ms when this reel became the active one. */
  startedAtMs: number;
  /** Wall-clock time the reel was on screen. */
  dwellMs: number;
  /** Time the video was actually playing. */
  watchedMs: number;
  durationSec: number;
  /** watchedMs / duration, capped at 1 per loop. */
  completion: number;
  loops: number;
  /** Left within 3 seconds. */
  skippedEarly: boolean;
  liked: boolean;
  soundOn: boolean;
}

export type GuardianAction =
  | "continue_calm_feed"
  | "breathing_break"
  | "end_session"
  | "set_limit"
  | "retune_feed";

export type GuardianSeverity = "gentle" | "firm" | "urgent";

export interface GuardianEvent {
  at: string;
  compulsion: number;
  severity: GuardianSeverity;
  headline: string;
  message: string;
  evidence: string[];
  action: GuardianAction;
  /** Intent the feed was retuned to, when action === "retune_feed". */
  retuneIntent?: string;
  source: "ai" | "offline";
  /** What the user did with the intervention. */
  response?: "accepted" | "dismissed";
}

export interface AutopsyPattern {
  title: string;
  evidence: string;
  severity: "info" | "watch" | "concern";
}

export interface AutopsyResult {
  headline: string;
  summary: string;
  patterns: AutopsyPattern[];
  experimentForTomorrow: string;
  scoreNote: string;
  source: "ai" | "offline";
  generatedAt: string;
}

export interface Commitment {
  id: string;
  text: string;
  createdAt: string;
  done: boolean;
}

export interface MoodLog {
  id: string;
  moodBefore?: Mood;
  reason?: WatchReason;
  moodAfter?: Mood;
  urgeToContinueScore?: number;
  exceededPlannedTime?: boolean;
  focusAfter?: FocusAfter;
  createdAt: string;
}

export interface VideoSession {
  id: string;
  /** False while the session is still running / was abandoned. Only completed sessions are scored. */
  completed?: boolean;
  /** The user's stated goal for this session (Intent Studio). */
  goal?: string;
  views?: ViewEvent[];
  guardianEvents?: GuardianEvent[];
  likes?: number;
  peakCompulsion?: number;
  autopsy?: AutopsyResult;
  plannedMinutes: number;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  videosWatched: number;
  skipCount: number;
  nextClicks: number;
  averageTimePerVideo: number;
  continuedAfterWarning: boolean;
  mindfulPauseCount: number;
  urgeToContinueScore: number;
  moodBefore?: Mood;
  moodAfter?: Mood;
  reason?: WatchReason;
  exceededPlannedTime?: boolean;
  focusAfter?: FocusAfter;
}

export interface CognitiveResult {
  reactionTimeMs?: number;
  reactionEarlyClicks?: number;
  memoryScore?: number;
  memoryWordsRemembered?: number;
  stroopScore?: number;
  stroopAccuracy?: number;
  stroopAverageMs?: number;
  updatedAt?: string;
}

export interface RiskInput {
  // Self-report (profile). `undefined` always means "not measured" and is excluded from scoring.
  dailyUsageMinutes?: number;
  lateNightUsageScore?: number;
  losesTrackOfTimeScore?: number;
  unintentionalOpeningScore?: number;
  studyHours?: number;
  sleepHours?: number;
  // Behaviour measured inside the Reels feed (recency-weighted over recent completed sessions).
  /** Minutes over the planned time. */
  plannedVsActualGap?: number;
  /** Average session length in SECONDS. */
  sessionDuration?: number;
  /** Reels per minute; fast swiping means compulsive browsing. */
  videosPerMinute?: number;
  /** Share of reels left within 3 seconds (0-1). */
  skipRate?: number;
  /** Peak live Compulsion Index (0-100). */
  peakCompulsion?: number;
  /** Share of Guardian warnings the user dismissed and kept scrolling (0-1). */
  warningIgnoredRate?: number;
  // Post-session self-report.
  urgeToContinueScore?: number;
  moodDropScore?: number;
  // Cognitive mini-tests.
  reactionTime?: number;
  memoryScore?: number;
  stroopScore?: number;
  // Metadata
  sessionsUsed?: number;
  trend?: RiskTrend;
}

export interface RiskTrend {
  direction: "improving" | "stable" | "worsening";
  /** Change in session intensity from first to last session (negative = improving). */
  delta: number;
  sessions: number;
}

export type RiskFactorGroup = "self-report" | "behaviour" | "cognitive" | "lifestyle";

export interface RiskFactor {
  key: string;
  label: string;
  group: RiskFactorGroup;
  /** Normalised 0-100 risk for this factor, or null when not measured. */
  score: number | null;
  /** Share of the final score this factor controls (renormalised over measured factors, 0-100). */
  weightPct: number;
  /** Points this factor adds to the addiction-risk score. */
  contribution: number;
  detail: string;
}

export interface RiskScore {
  addictionRiskScore: number;
  /** Null until the reaction/Stroop tests have been taken. */
  focusScore: number | null;
  /** Null until the memory test has been taken. */
  memoryScore: number | null;
  impulseControlScore: number;
  moodDependencyScore: number;
  digitalWellbeingScore: number;
  finalRiskCategory: RiskCategory;
  topRiskFactors: string[];
  recommendations: Recommendation[];
  /** Plain-language explanation generated from the real inputs. */
  explanation: string;
  /** 0-100: how much of the model's weight is backed by real measurements. */
  confidence: number;
  breakdown: RiskFactor[];
  /** Human-readable list of missing evidence (e.g. "Cognitive tests"). */
  missing: string[];
  trend?: RiskTrend;
  sessionsUsed: number;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  category: "Immediate" | "7-day plan" | "Study routine" | "Reflection";
  title: string;
  detail: string;
  priority: "low" | "medium" | "high";
}

export interface ExportReport {
  profile: UserProfile | null;
  latestSession: VideoSession | null;
  moodLogs: MoodLog[];
  cognitiveResult: CognitiveResult | null;
  riskScore: RiskScore | null;
  generatedAt: string;
}
