import type { VideoItem } from "@/types";

interface RawYouTubeItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

export const youtubeQueries = [
  "study motivation",
  "productivity tips",
  "funny short videos",
  "science facts",
  "student life",
  "tech shorts",
  "motivation shorts",
  "educational shorts"
];

export function pickYouTubeQuery() {
  return youtubeQueries[Math.floor(Math.random() * youtubeQueries.length)];
}

export function normalizeYouTubeItems(items: RawYouTubeItem[]): VideoItem[] {
  return items
    .map((item) => {
      const id = item.id?.videoId;
      if (!id) return null;

      return {
        id,
        title: item.snippet?.title ?? "Untitled short video",
        channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${id}`
      } satisfies VideoItem;
    })
    .filter((video): video is VideoItem => Boolean(video));
}
