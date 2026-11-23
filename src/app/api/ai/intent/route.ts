import { NextResponse } from "next/server";
import { runIntent } from "@/lib/ai/agents";
import { guardRequest } from "@/lib/ai/http";
import { IntentRequestSchema } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const guard = await guardRequest(request, "intent", 10, IntentRequestSchema);
  if (!guard.ok) return guard.response;
  const plan = await runIntent(guard.data);
  return NextResponse.json(plan);
}
