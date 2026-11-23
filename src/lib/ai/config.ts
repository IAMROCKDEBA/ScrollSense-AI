import Anthropic from "@anthropic-ai/sdk";

/** claude-opus-5-5 is the current default; override with ANTHROPIC_MODEL / ANTHROPIC_FAST_MODEL (e.g. claude-sonnet-5-5, claude-haiku-5-5). */
export const DEFAULT_MODEL = "claude-opus-5-5";

export interface AiConfig {
  live: boolean;
  model: string;
  fastModel: string;
}

export function aiConfig(): AiConfig {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  return {
    live: Boolean(key),
    model,
    fastModel: process.env.ANTHROPIC_FAST_MODEL?.trim() || model
  };
}

let client: Anthropic | null = null;

/** Lazily created server-side singleton. Returns null when no key is configured. */
export function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 60_000 });
  return client;
}

/** Test hook. */
export function resetAnthropicClient(next: Anthropic | null = null) {
  client = next;
}
