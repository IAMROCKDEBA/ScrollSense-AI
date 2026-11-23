import Anthropic from "@anthropic-ai/sdk";
import type { CoachEvent } from "./events";

type ErrorEvent = Extract<CoachEvent, { type: "error" }>;

/** Map SDK errors to a friendly, non-leaky message (never echo raw provider errors or keys). */
export function describeAiError(error: unknown): ErrorEvent {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { type: "error", code: "auth", message: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY on the server." };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { type: "error", code: "rate_limited", message: "The AI is rate limited right now. Try again in a moment." };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { type: "error", code: "network", message: "Could not reach the AI service. Check the connection." };
  }
  if (error instanceof Anthropic.InternalServerError) {
    return { type: "error", code: "overloaded", message: "The AI service is overloaded. Try again shortly." };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return { type: "error", code: "invalid", message: "The AI request was rejected. If you changed the model, check it is available to your key." };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return { type: "error", code: "invalid", message: "The configured Claude model was not found for this key. Check ANTHROPIC_MODEL." };
  }
  return { type: "error", code: "unknown", message: "Something went wrong while talking to the AI." };
}
