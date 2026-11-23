import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 96 * 1024;

export type GuardResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** Shared request guard: rate limit, size cap, JSON parse and zod validation. */
export async function guardRequest<T>(request: Request, scope: string, limit: number, schema: ZodType<T>): Promise<GuardResult<T>> {
  const rl = rateLimit(clientKey(request, scope), limit, 60_000);
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      )
    };
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Could not read the request." }, { status: 400 }) };
  }
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: "Request too large." }, { status: 413 }) };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request.", issues: parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.message}`) },
        { status: 400 }
      )
    };
  }
  return { ok: true, data: parsed.data };
}

const encoder = new TextEncoder();

export function sseFrame(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const sseHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no"
};
