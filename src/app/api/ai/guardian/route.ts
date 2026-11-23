import { NextResponse } from "next/server";
import { runGuardian } from "@/lib/ai/agents";
import { guardRequest } from "@/lib/ai/http";
import { GuardianContextSchema } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const guard = await guardRequest(request, "guardian", 15, GuardianContextSchema);
  if (!guard.ok) return guard.response;
  const result = await runGuardian(guard.data);
  return NextResponse.json(result);
}
