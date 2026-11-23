import { z } from "zod";

/**
 * Runtime contracts for everything that crosses the browser <-> server <-> Claude boundary.
 * Browser data is untrusted: every field is type-checked and length-capped before it is used or shown to a model.
 */

export const MoodSchema = z.enum(["Happy", "Bored", "Stressed", "Anxious", "Lonely", "Tired", "Procrastinating", "Neutral"]);
export const FrequencySchema = z.enum(["Never", "Rarely", "Sometimes", "Often", "Always"]);
export const WatchReasonSchema = z.enum(["Entertainment", "Boredom", "Stress relief", "Habit", "Procrastination", "Learning", "Motivation"]);

const num = z.number().finite();
const shortText = (max: number) => z.string().max(max);

export const ProfileSnapshotSchema = z.object({
  name: shortText(40).optional(),
  age: num.optional(),
  studentStatus: shortText(20).optional(),
  dailyUsageMinutes: num,
  mainPlatform: shortText(30).optional(),
  studyHours: num,
  sleepHours: num,
  lateNightUsage: FrequencySchema,
  losesTrackOfTime: FrequencySchema,
  unintentionalOpening: FrequencySchema
});

export const ViewSummarySchema = z.object({
  videos: num,
  videosPerMinute: num,
  skipRate: num,
  avgDwellSec: num,
  avgCompletion: num,
  likes: num,
  rewatches: num,
  longestSkipStreak: num,
  dwellSlopePerVideo: num,
  firstHalfDwellSec: num,
  secondHalfDwellSec: num
});

export const GuardianEventSnapshotSchema = z.object({
  severity: z.enum(["gentle", "firm", "urgent"]).optional(),
  headline: shortText(120).optional(),
  action: shortText(30).optional(),
  response: z.enum(["accepted", "dismissed"]).optional()
});

export const SessionSnapshotSchema = z.object({
  id: shortText(80),
  startedAt: shortText(40),
  endedAt: shortText(40).optional(),
  completed: z.boolean().optional(),
  goal: shortText(240).optional(),
  durationSeconds: num,
  plannedMinutes: num,
  videosWatched: num,
  skipCount: num,
  nextClicks: num.default(0),
  averageTimePerVideo: num.default(0),
  continuedAfterWarning: z.boolean().default(false),
  mindfulPauseCount: num.default(0),
  urgeToContinueScore: num,
  moodBefore: MoodSchema.optional(),
  moodAfter: MoodSchema.optional(),
  reason: WatchReasonSchema.optional(),
  exceededPlannedTime: z.boolean().optional(),
  focusAfter: z.enum(["More focused", "Same", "Less focused"]).optional(),
  likes: num.optional(),
  peakCompulsion: num.optional(),
  guardianEvents: z.array(GuardianEventSnapshotSchema).max(10).optional(),
  summary: ViewSummarySchema.optional()
});

export const MoodLogSnapshotSchema = z.object({
  id: shortText(80),
  moodBefore: MoodSchema.optional(),
  moodAfter: MoodSchema.optional(),
  reason: WatchReasonSchema.optional(),
  urgeToContinueScore: num.optional(),
  exceededPlannedTime: z.boolean().optional(),
  createdAt: shortText(40)
});

export const CognitiveSnapshotSchema = z.object({
  reactionTimeMs: num.optional(),
  reactionEarlyClicks: num.optional(),
  memoryScore: num.optional(),
  memoryWordsRemembered: num.optional(),
  stroopScore: num.optional(),
  stroopAccuracy: num.optional(),
  stroopAverageMs: num.optional(),
  updatedAt: shortText(40).optional()
});

export const SnapshotSchema = z.object({
  profile: ProfileSnapshotSchema.nullable(),
  sessions: z.array(SessionSnapshotSchema).max(30),
  moodLogs: z.array(MoodLogSnapshotSchema).max(30),
  cognitive: CognitiveSnapshotSchema.nullable(),
  dailyLimitMinutes: num.nullable(),
  commitments: z.array(z.object({ text: shortText(160), done: z.boolean() })).max(15),
  demoPersona: z.boolean().default(false)
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>;

// ---------------------------------------------------------------------------------- coach
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: shortText(4000)
});

export const CoachRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(24),
  snapshot: SnapshotSchema
});
export type CoachRequest = z.infer<typeof CoachRequestSchema>;

export const APP_PATHS = ["/", "/feed", "/tests", "/dashboard", "/recommendations", "/report", "/coach", "/settings", "/methodology"] as const;

export const ToolInputSchemas = {
  get_profile: z.object({}),
  get_risk_breakdown: z.object({}),
  get_recent_sessions: z.object({ limit: num.int().min(1).max(10).default(5) }),
  get_session_detail: z.object({ session_id: shortText(80).optional() }),
  get_mood_trend: z.object({}),
  get_cognitive_results: z.object({}),
  simulate_what_if: z.object({
    sleepHours: num.min(3).max(12).optional(),
    studyHours: num.min(0).max(14).optional(),
    dailyUsageMinutes: num.min(0).max(600).optional(),
    lateNightUsage: FrequencySchema.optional(),
    unintentionalOpening: FrequencySchema.optional(),
    videosPerMinute: num.min(0).max(12).optional(),
    sessionMinutes: num.min(1).max(180).optional(),
    urgeToContinue: num.min(1).max(10).optional()
  }),
  navigate: z.object({ path: z.enum(APP_PATHS) }),
  start_breathing_break: z.object({ seconds: num.int().min(15).max(120).default(30) }),
  set_daily_limit: z.object({ minutes: num.int().min(5).max(240) }),
  start_intent_feed: z.object({ goal: shortText(200), minutes: num.int().min(1).max(60).default(10) }),
  launch_cognitive_test: z.object({ test: z.enum(["reaction", "memory", "stroop"]) }),
  save_commitment: z.object({ text: shortText(140).min(3) })
} as const;
export type ToolName = keyof typeof ToolInputSchemas;

// ------------------------------------------------------------------- structured agents
export const GuardianContextSchema = z.object({
  compulsion: num.min(0).max(100),
  level: z.enum(["calm", "drifting", "compulsive"]),
  evidence: z.array(shortText(200)).max(6),
  components: z.array(z.object({ label: shortText(40), contribution: num, detail: shortText(160) })).max(8),
  elapsedSec: num,
  plannedMinutes: num,
  hour: num.int().min(0).max(23),
  videosWatched: num,
  recentDwellSec: z.array(num).max(12),
  goal: shortText(240).optional(),
  moodBefore: MoodSchema.optional(),
  previous: z.array(z.object({ headline: shortText(120), action: shortText(30), response: z.enum(["accepted", "dismissed"]).optional() })).max(6),
  name: shortText(40).optional(),
  dailyLimitMinutes: num.nullable().optional()
});
export type GuardianContext = z.infer<typeof GuardianContextSchema>;

export const GuardianOutputSchema = z.object({
  severity: z.enum(["gentle", "firm", "urgent"]),
  headline: z.string(),
  message: z.string(),
  action: z.enum(["continue_calm_feed", "breathing_break", "end_session", "set_limit", "retune_feed"]),
  retuneIntent: z.string().optional(),
  limitMinutes: z.number().optional()
});
export type GuardianOutput = z.infer<typeof GuardianOutputSchema>;

export const IntentRequestSchema = z.object({
  goal: shortText(240),
  plannedMinutes: num.min(1).max(120),
  moodBefore: MoodSchema,
  reason: WatchReasonSchema,
  name: shortText(40).optional(),
  hour: num.int().min(0).max(23),
  recentRisk: num.min(0).max(100).optional()
});
export type IntentRequestBody = z.infer<typeof IntentRequestSchema>;

export const IntentOutputSchema = z.object({
  queries: z.array(z.string()),
  plannedMinutes: z.number(),
  tone: z.enum(["calm", "curious", "playful", "focused"]),
  guardrails: z.array(z.string()),
  mantra: z.string()
});

export const ViewEventSnapshotSchema = z.object({
  index: num,
  title: shortText(140),
  topic: shortText(80).optional(),
  dwellSec: num,
  watchedSec: num,
  completion: num,
  loops: num,
  skippedEarly: z.boolean(),
  liked: z.boolean()
});

export const AutopsyRequestSchema = z.object({
  session: SessionSnapshotSchema,
  views: z.array(ViewEventSnapshotSchema).max(150),
  score: z.object({ addictionRiskScore: num, category: shortText(20), confidence: num }).optional(),
  name: shortText(40).optional()
});
export type AutopsyRequest = z.infer<typeof AutopsyRequestSchema>;

export const AutopsyOutputSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  patterns: z.array(
    z.object({
      title: z.string(),
      evidence: z.string(),
      severity: z.enum(["info", "watch", "concern"])
    })
  ),
  experimentForTomorrow: z.string(),
  scoreNote: z.string()
});
export type AutopsyOutput = z.infer<typeof AutopsyOutputSchema>;
