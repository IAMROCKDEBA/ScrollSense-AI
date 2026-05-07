import { NextResponse } from "next/server";
import { demoVideos } from "@/data/demo-videos";
import { normalizeYouTubeItems, pickYouTubeQuery } from "@/lib/youtube";
import type { YouTubeSearchResponse } from "@/types";

export const dynamic = "force-dynamic";

const cache = new Map<string, { expiresAt: number; response: YouTubeSearchResponse }>();
const CACHE_TTL_MS = 1000 * 60 * 20;

function demoResponse(message: string, query?: string): YouTubeSearchResponse {
  return {
    mode: "demo",
    videos: demoVideos,
    message,
    query,
    fetchedAt: new Date().toISOString()
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forcedDemo = url.searchParams.get("demo") === "true";
  const query = url.searchParams.get("q") || pickYouTubeQuery();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (forcedDemo) {
    return NextResponse.json(demoResponse("Demo video feed is active.", query));
  }

  if (!apiKey) {
    return NextResponse.json(
      demoResponse("Live public videos are unavailable right now, so demo videos are active.", query)
    );
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.response);
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoDuration", "short");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("safeSearch", "moderate");
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("regionCode", "IN");
  searchUrl.searchParams.set("relevanceLanguage", "en");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(searchUrl, {
      next: { revalidate: 1200 }
    });

    if (!response.ok) {
      return NextResponse.json(
        demoResponse("Live public videos are temporarily unavailable, so demo videos are active.", query),
        { status: 200 }
      );
    }

    const data = (await response.json()) as { items?: unknown };
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const videos = normalizeYouTubeItems(rawItems as Parameters<typeof normalizeYouTubeItems>[0]);

    if (videos.length === 0) {
      return NextResponse.json(
        demoResponse("No playable public videos were returned, so demo videos are active.", query)
      );
    }

    const normalized: YouTubeSearchResponse = {
      mode: "youtube",
      videos,
      query,
      fetchedAt: new Date().toISOString()
    };

    cache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response: normalized
    });

    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json(
      demoResponse("The live video feed could not be reached, so demo videos are active.",
        query),
      { status: 200 }
    );
  }
}
