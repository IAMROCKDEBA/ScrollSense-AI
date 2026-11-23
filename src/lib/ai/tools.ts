import type Anthropic from "@anthropic-ai/sdk";
import { APP_PATHS } from "./schemas";

const freq = { type: "string", enum: ["Never", "Rarely", "Sometimes", "Often", "Always"] } as const;

/**
 * Tool surface of the Sense Coach agent.
 *   read     -> query the user's local data (sent as a snapshot with every request)
 *   simulate -> run the app's real scoring model on hypothetical changes
 *   act      -> change something in the app; the browser executes it and the user can undo it
 * `eager_input_streaming` lets tool inputs stream as they are generated; inputs are still validated with zod before running.
 */
export const coachTools: Anthropic.Tool[] = [
  {
    name: "get_profile",
    description: "Read the user's self-reported habits (daily usage, sleep, study hours, late-night and unintentional use). Does not include their name.",
    input_schema: { type: "object", properties: {}, required: [] },
    eager_input_streaming: true
  },
  {
    name: "get_risk_breakdown",
    description:
      "Get the user's current scores (risk, focus, impulse control, mood dependency, well-being), model confidence, trend, and the exact points each factor contributes. Use before explaining or comparing any score.",
    input_schema: { type: "object", properties: {}, required: [] },
    eager_input_streaming: true
  },
  {
    name: "get_recent_sessions",
    description: "List the user's most recent completed Reels sessions (duration, videos, skip rate, urge, peak compulsion, goal).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 10, description: "How many sessions to return (default 5)." } },
      required: []
    },
    eager_input_streaming: true
  },
  {
    name: "get_session_detail",
    description: "Get detailed telemetry for one session: attention decay, skip streaks, Guardian interventions. Omit session_id for the latest session.",
    input_schema: { type: "object", properties: { session_id: { type: "string" } }, required: [] },
    eager_input_streaming: true
  },
  {
    name: "get_mood_trend",
    description: "Get recent mood-before vs mood-after check-ins and the average mood change per session.",
    input_schema: { type: "object", properties: {}, required: [] },
    eager_input_streaming: true
  },
  {
    name: "get_cognitive_results",
    description: "Get the user's reaction-time, memory and Stroop brain-test results, if taken.",
    input_schema: { type: "object", properties: {}, required: [] },
    eager_input_streaming: true
  },
  {
    name: "simulate_what_if",
    description:
      "Re-run the app's REAL scoring model with hypothetical changes (e.g. sleep 8 h, 30 fewer minutes per day, no late-night use) and return the before/after risk score. Use this to answer 'what if' questions instead of guessing.",
    input_schema: {
      type: "object",
      properties: {
        sleepHours: { type: "number", minimum: 3, maximum: 12 },
        studyHours: { type: "number", minimum: 0, maximum: 14 },
        dailyUsageMinutes: { type: "number", minimum: 0, maximum: 600 },
        lateNightUsage: freq,
        unintentionalOpening: freq,
        videosPerMinute: { type: "number", minimum: 0, maximum: 12 },
        sessionMinutes: { type: "number", minimum: 1, maximum: 180 },
        urgeToContinue: { type: "number", minimum: 1, maximum: 10 }
      },
      required: []
    },
    eager_input_streaming: true
  },
  {
    name: "navigate",
    description: "Open a page in the app for the user. Only when they ask to see something or it clearly helps.",
    input_schema: { type: "object", properties: { path: { type: "string", enum: [...APP_PATHS] } }, required: ["path"] },
    eager_input_streaming: true
  },
  {
    name: "start_breathing_break",
    description: "Start a guided breathing break on the user's screen (15-120 seconds). Use when they are stressed, urgent, or ask for a pause.",
    input_schema: { type: "object", properties: { seconds: { type: "integer", minimum: 15, maximum: 120 } }, required: [] },
    eager_input_streaming: true
  },
  {
    name: "set_daily_limit",
    description: "Set the user's soft daily short-video limit in minutes. Only after they agree to a specific number.",
    input_schema: { type: "object", properties: { minutes: { type: "integer", minimum: 5, maximum: 240 } }, required: ["minutes"] },
    eager_input_streaming: true
  },
  {
    name: "start_intent_feed",
    description: "Prepare an intentional Reels session around a goal (e.g. 'calm down then learn something'). The user confirms before it starts.",
    input_schema: {
      type: "object",
      properties: { goal: { type: "string", maxLength: 200 }, minutes: { type: "integer", minimum: 1, maximum: 60 } },
      required: ["goal"]
    },
    eager_input_streaming: true
  },
  {
    name: "launch_cognitive_test",
    description: "Open one of the brain tests (reaction, memory, stroop) so the user can measure how scrolling affects them.",
    input_schema: { type: "object", properties: { test: { type: "string", enum: ["reaction", "memory", "stroop"] } }, required: ["test"] },
    eager_input_streaming: true
  },
  {
    name: "save_commitment",
    description: "Save a short, specific commitment the user just made (e.g. 'No Shorts after 11 pm this week').",
    input_schema: { type: "object", properties: { text: { type: "string", maxLength: 140 } }, required: ["text"] },
    eager_input_streaming: true
  }
];
