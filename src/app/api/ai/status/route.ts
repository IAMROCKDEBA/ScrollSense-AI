import { NextResponse } from "next/server";
import { aiConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reports whether live AI is configured. Never returns the key itself. */
export function GET() {
  const config = aiConfig();
  return NextResponse.json({
    live: config.live,
    model: config.live ? config.model : null,
    fastModel: config.live ? config.fastModel : null
  });
}
