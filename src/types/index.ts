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
  embedUrl: string;
}

export interface YouTubeSearchResponse {
  mode: "youtube" | "demo";
  videos: VideoItem[];
  message?: string;
  query?: string;
  fetchedAt: string;
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
  dailyUsageMinutes?: number;
  lateNightUsageScore?: number;
  losesTrackOfTimeScore?: number;
  unintentionalOpeningScore?: number;
  plannedVsActualGap?: number;
  sessionDuration?: number;
  videosWatched?: number;
  skipRate?: number;
  urgeToContinueScore?: number;
  moodDropScore?: number;
  studyHours?: number;
  sleepHours?: number;
  reactionTime?: number;
  memoryScore?: number;
  stroopScore?: number;
  continuedAfterWarning?: boolean;
}

export interface RiskScore {
  addictionRiskScore: number;
  focusScore: number;
  memoryScore: number;
  impulseControlScore: number;
  moodDependencyScore: number;
  digitalWellbeingScore: number;
  finalRiskCategory: RiskCategory;
  topRiskFactors: string[];
  recommendations: Recommendation[];
  explanation: string;
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
