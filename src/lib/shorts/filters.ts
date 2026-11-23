import type { VideoItem } from "@/types";

/** Parse an ISO-8601 duration such as PT1M5S into seconds. Returns NaN when invalid. */
export function parseIsoDuration(value: string | undefined): number {
  if (!value) return Number.NaN;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!match) return Number.NaN;
  const [, d, h, m, s] = match;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

export interface YouTubeVideoDetails {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
  contentDetails?: {
    duration?: string;
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
  };
}

export const SHORTS_MAX_SECONDS = 60;

export function isPlayableShort(item: YouTubeVideoDetails, region = "IN") {
  if (!item.id) return false;
  const duration = parseIsoDuration(item.contentDetails?.duration);
  if (!Number.isFinite(duration) || duration < 3 || duration > SHORTS_MAX_SECONDS) return false;
  const blocked = item.contentDetails?.regionRestriction?.blocked ?? [];
  const allowed = item.contentDetails?.regionRestriction?.allowed;
  const playableInRegion = !blocked.includes(region) && (!allowed || allowed.includes(region));
  return (
    item.status?.embeddable === true &&
    item.status?.privacyStatus === "public" &&
    item.status?.uploadStatus === "processed" &&
    playableInRegion
  );
}

export function toVideoItem(item: YouTubeVideoDetails, topic: string): VideoItem {
  const id = item.id as string;
  const thumbs = item.snippet?.thumbnails ?? {};
  return {
    id,
    title: item.snippet?.title ?? "Untitled short",
    channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
    thumbnail:
      thumbs.maxres?.url ??
      thumbs.high?.url ??
      thumbs.medium?.url ??
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    durationSec: parseIsoDuration(item.contentDetails?.duration),
    topic
  };
}

/** Fisher-Yates shuffle (unbiased, unlike sort(() => Math.random() - 0.5)). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Round-robin merge so a feed alternates between topics instead of showing one topic in a block. */
export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < max; i += 1) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
