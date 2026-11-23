import type { VideoItem } from "@/types";
import { dedupeById, isPlayableShort, shuffle, toVideoItem, type YouTubeVideoDetails } from "./filters";

const YT = "https://www.googleapis.com/youtube/v3";
const POOL_TTL_MS = 1000 * 60 * 30;
const FETCH_TIMEOUT_MS = 8000;

interface PoolEntry {
  expiresAt: number;
  videos: VideoItem[];
}

const pools = new Map<string, PoolEntry>();

export class QuotaError extends Error {
  constructor(message = "YouTube API quota or key problem") {
    super(message);
    this.name = "QuotaError";
  }
}

async function ytJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (response.status === 403 || response.status === 400 || response.status === 429) {
    throw new QuotaError(`YouTube API responded ${response.status}`);
  }
  if (!response.ok) throw new Error(`YouTube API responded ${response.status}`);
  return (await response.json()) as T;
}

/** True when youtube.com serves /shorts/{id} directly (a real Short) instead of redirecting to /watch. */
async function isRealShort(id: string): Promise<boolean | null> {
  try {
    const response = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });
    if (response.status === 200) return true;
    if (response.status >= 300 && response.status < 400) return false;
    return null;
  } catch {
    return null;
  }
}

export async function verifyShorts(candidates: VideoItem[]): Promise<VideoItem[]> {
  // One parallel wave (measured ~1.3s for 16-40 checks) instead of chunked sequential waves.
  const results = await Promise.all(candidates.slice(0, 48).map((video) => isRealShort(video.id)));
  const confirmed = candidates.filter((_, index) => results[index] === true);
  // Degrade gracefully: if the check is unusable (consent wall, network), trust duration <= 60s.
  if (confirmed.length === 0) return candidates;
  return confirmed;
}

export async function buildPool(query: string, apiKey: string): Promise<VideoItem[]> {
  const search = new URL(`${YT}/search`);
  search.searchParams.set("part", "snippet");
  search.searchParams.set("type", "video");
  search.searchParams.set("videoDuration", "short");
  search.searchParams.set("videoEmbeddable", "true");
  search.searchParams.set("safeSearch", "moderate");
  search.searchParams.set("maxResults", "40");
  search.searchParams.set("relevanceLanguage", "en");
  search.searchParams.set("q", /#shorts/i.test(query) ? query : `${query} #shorts`);
  search.searchParams.set("key", apiKey);

  const found = await ytJson<{ items?: { id?: { videoId?: string } }[] }>(search);
  const ids = (found.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const details = new URL(`${YT}/videos`);
  details.searchParams.set("part", "snippet,status,contentDetails");
  details.searchParams.set("id", ids.join(","));
  details.searchParams.set("key", apiKey);
  const detail = await ytJson<{ items?: YouTubeVideoDetails[] }>(details);

  const playable = (detail.items ?? []).filter((item) => isPlayableShort(item)).map((item) => toVideoItem(item, query));
  return verifyShorts(playable);
}

/** Returns a cached, verified pool for a query; builds it (about 101 quota units) at most once per TTL. */
export async function getPool(query: string, apiKey: string): Promise<VideoItem[]> {
  const key = query.toLowerCase();
  const cached = pools.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.videos;
  const videos = shuffle(dedupeById(await buildPool(query, apiKey)));
  pools.set(key, { expiresAt: Date.now() + POOL_TTL_MS, videos });
  return videos;
}

export function clearPools() {
  pools.clear();
}
