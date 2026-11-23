import { NextResponse } from "next/server";
import { runAutopsy } from "@/lib/ai/agents";
import { guardRequest } from "@/lib/ai/http";
import { AutopsyRequestSchema } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const guard = await guardRequest(request, "autopsy", 6, AutopsyRequestSchema);
  if (!guard.ok) return guard.response;
  const result = await runAutopsy(guard.data);
  return NextResponse.json(result);
}
