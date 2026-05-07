import { NextResponse } from "next/server";
import { demoVideos } from "@/data/demo-videos";
import { normalizeYouTubeItems, pickYouTubeQuery } from "@/lib/youtube";
import type { VideoItem, YouTubeSearchResponse } from "@/types";

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

interface YouTubeVideoDetailsItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
  contentDetails?: {
    regionRestriction?: {
      allowed?: string[];
      blocked?: string[];
    };
  };
}

async function fetchVerifiedEmbeddableVideos(videoIds: string[], apiKey: string, bypassCache = false) {
  if (videoIds.length === 0) return [];

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "snippet,status,contentDetails");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", apiKey);

  const response = await fetch(
    detailsUrl,
    bypassCache
      ? { cache: "no-store" }
      : {
          next: { revalidate: 1200 }
        }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as { items?: unknown };
  const items = Array.isArray(data.items) ? (data.items as YouTubeVideoDetailsItem[]) : [];

  return items
    .filter((item) => {
      const blockedRegions = item.contentDetails?.regionRestriction?.blocked ?? [];
      const allowedRegions = item.contentDetails?.regionRestriction?.allowed;
      const playableInIndia = !blockedRegions.includes("IN") && (!allowedRegions || allowedRegions.includes("IN"));

      return (
        item.id &&
        item.status?.embeddable === true &&
        item.status?.privacyStatus === "public" &&
        item.status?.uploadStatus === "processed" &&
        playableInIndia
      );
    })
    .map((item) => {
      const id = item.id as string;
      return {
        id,
        title: item.snippet?.title ?? "Untitled public video",
        channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${id}`
      } satisfies VideoItem;
    });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forcedDemo = url.searchParams.get("demo") === "true";
  const query = url.searchParams.get("q") || pickYouTubeQuery();
  const excludedIds = new Set(
    (url.searchParams.get("exclude") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
  const bypassCache = url.searchParams.has("refresh") || excludedIds.size > 0;
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
  if (!bypassCache && cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.response);
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoDuration", "short");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("safeSearch", "moderate");
  searchUrl.searchParams.set("maxResults", "25");
  searchUrl.searchParams.set("regionCode", "IN");
  searchUrl.searchParams.set("relevanceLanguage", "en");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(
      searchUrl,
      bypassCache
        ? { cache: "no-store" }
        : {
            next: { revalidate: 1200 }
          }
    );

    if (!response.ok) {
      return NextResponse.json(
        demoResponse("Live public videos are temporarily unavailable, so demo videos are active.", query),
        { status: 200 }
      );
    }

    const data = (await response.json()) as { items?: unknown };
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const searchVideos = normalizeYouTubeItems(rawItems as Parameters<typeof normalizeYouTubeItems>[0]);
    const videos = (await fetchVerifiedEmbeddableVideos(
      searchVideos.map((video) => video.id),
      apiKey,
      bypassCache
    )).filter((video) => !excludedIds.has(video.id));

    if (videos.length === 0) {
      return NextResponse.json(
        demoResponse("No verified playable public videos were returned, so demo videos are active.", query)
      );
    }

    const normalized: YouTubeSearchResponse = {
      mode: "youtube",
      videos,
      query,
      fetchedAt: new Date().toISOString()
    };

    if (!bypassCache) {
      cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        response: normalized
      });
    }

    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json(
      demoResponse("The live video feed could not be reached, so demo videos are active.",
        query),
      { status: 200 }
    );
  }
}
