/** Wire format shared by the Coach route (server) and the Coach UI (browser). */

export type CoachAction =
  | { type: "navigate"; path: string }
  | { type: "start_breathing_break"; seconds: number }
  | { type: "set_daily_limit"; minutes: number }
  | { type: "start_intent_feed"; goal: string; minutes: number }
  | { type: "launch_cognitive_test"; test: "reaction" | "memory" | "stroop" }
  | { type: "save_commitment"; text: string };

export type CoachCard =
  | {
      type: "risk";
      score: number;
      category: string;
      confidence: number;
      focus: number | null;
      wellbeing: number;
      impulse: number;
      topFactors: string[];
      trend?: string;
    }
  | { type: "breakdown"; factors: { label: string; contribution: number; detail: string }[] }
  | {
      type: "sessions";
      rows: { id: string; when: string; minutes: number; videos: number; skipPct: number; urge: number; peak?: number; goal?: string }[];
    }
  | {
      type: "what_if";
      before: { score: number; category: string };
      after: { score: number; category: string };
      delta: number;
      changes: { label: string; from: string; to: string }[];
      factorDeltas: { label: string; delta: number }[];
    }
  | { type: "mood"; points: { label: string; before: string; after: string }[] }
  | { type: "cognitive"; reactionMs?: number; memory?: number; stroop?: number };

export type CoachEvent =
  | { type: "text"; delta: string }
  | { type: "thinking"; delta: string }
  | { type: "tool_start"; id: string; name: string }
  | { type: "tool_result"; id: string; name: string; summary: string; ms: number; card?: CoachCard; error?: boolean }
  | { type: "action"; id: string; label: string; action: CoachAction }
  | { type: "usage"; inputTokens: number; outputTokens: number; cacheReadTokens: number }
  | { type: "done"; stopReason: string; iterations: number; ms: number; model: string; source: "ai" | "offline" }
  | { type: "error"; code: "no_key" | "rate_limited" | "auth" | "overloaded" | "network" | "invalid" | "refused" | "unknown"; message: string };

export const toolLabels: Record<string, string> = {
  get_profile: "Reading your profile",
  get_risk_breakdown: "Analysing your risk score",
  get_recent_sessions: "Reviewing your recent sessions",
  get_session_detail: "Inspecting a session",
  get_mood_trend: "Checking your mood trend",
  get_cognitive_results: "Looking at your brain-test results",
  simulate_what_if: "Simulating what-if scenarios",
  navigate: "Opening a page",
  start_breathing_break: "Starting a breathing break",
  set_daily_limit: "Setting your daily limit",
  start_intent_feed: "Planning an intent feed",
  launch_cognitive_test: "Launching a brain test",
  save_commitment: "Saving your commitment"
};

/** Client-safe shape of a Guardian decision (also used by the API route and the offline fallback). */
export interface GuardianResponse {
  severity: "gentle" | "firm" | "urgent";
  headline: string;
  message: string;
  evidence: string[];
  action: "continue_calm_feed" | "breathing_break" | "end_session" | "set_limit" | "retune_feed";
  retuneIntent?: string;
  limitMinutes?: number;
  source: "ai" | "offline";
}
