import { NextResponse } from "next/server";
import seed from "@/data/shorts-seed.json";
import type { ShortsResponse, VideoItem } from "@/types";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { dedupeById, interleave, shuffle } from "@/lib/shorts/filters";
import { getPool, QuotaError } from "@/lib/shorts/pool";
import { parseExcludeIds, parseQueries, pickTopics } from "@/lib/shorts/topics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const seedVideos = seed as unknown as VideoItem[];

function seedResponse(message: string, exclude: Set<string>, count: number, queries: string[]): ShortsResponse {
  const fresh = shuffle(seedVideos.filter((video) => !exclude.has(video.id)));
  // When the viewer has seen everything, recycle rather than return an empty feed.
  const videos = (fresh.length >= 4 ? fresh : shuffle(seedVideos)).slice(0, count);
  return { mode: "seed", videos, message, queries, fetchedAt: new Date().toISOString() };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = rateLimit(clientKey(request, "shorts"), 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many feed requests. Slow down for a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const forceSeed = url.searchParams.get("demo") === "true";
  const exclude = parseExcludeIds(url.searchParams.get("exclude"));
  const requested = parseQueries(url.searchParams.get("q"));
  const queries = requested.length > 0 ? requested : pickTopics(3);
  const count = Math.min(40, Math.max(6, Number(url.searchParams.get("count")) || 24));
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (forceSeed) return NextResponse.json(seedResponse("Offline demo pool is active.", exclude, count, queries));
  if (!apiKey) {
    return NextResponse.json(
      seedResponse("Live feed needs a YouTube API key, so the offline pool is active.", exclude, count, queries)
    );
  }

  try {
    const pools = await Promise.all(
      queries.map((query) =>
        getPool(query, apiKey).catch((error) => {
          if (error instanceof QuotaError) throw error;
          return [] as VideoItem[];
        })
      )
    );
    const merged = dedupeById(interleave(pools)).filter((video) => !exclude.has(video.id)).slice(0, count);

    if (merged.length < 4) {
      return NextResponse.json(
        seedResponse("Not enough fresh Shorts were found, so the offline pool filled in.", exclude, count, queries)
      );
    }
    const response: ShortsResponse = { mode: "youtube", videos: merged, queries, fetchedAt: new Date().toISOString() };
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof QuotaError
        ? "YouTube quota reached, so the offline pool is active."
        : "The live feed could not be reached, so the offline pool is active.";
    return NextResponse.json(seedResponse(message, exclude, count, queries));
  }
}
