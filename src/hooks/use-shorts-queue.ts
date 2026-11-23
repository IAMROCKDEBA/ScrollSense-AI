"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShortsResponse, VideoItem } from "@/types";

const MAX_EXCLUDE = 120;

export interface ShortsQueue {
  videos: VideoItem[];
  mode: "youtube" | "seed";
  message: string;
  loading: boolean;
  error: string;
  /** Fetch the first batch for the given queries (resets the queue). */
  prime: (queries: string[], forceSeed?: boolean) => Promise<boolean>;
  /** Append more videos for the current queries. Safe to call repeatedly. */
  loadMore: () => Promise<void>;
  /** Keep everything up to and including `keepThrough`, replace the rest with fresh videos for new queries. */
  retune: (queries: string[], keepThrough: number) => Promise<boolean>;
  /** Remove a video that failed to embed. */
  drop: (id: string) => void;
}

async function requestShorts(queries: string[], exclude: string[], forceSeed: boolean, count = 24): Promise<ShortsResponse> {
  const params = new URLSearchParams();
  if (queries.length) params.set("q", queries.join("|"));
  if (exclude.length) params.set("exclude", exclude.slice(-MAX_EXCLUDE).join(","));
  if (forceSeed) params.set("demo", "true");
  params.set("count", String(count));
  const response = await fetch(`/api/shorts?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Feed responded ${response.status}`);
  return (await response.json()) as ShortsResponse;
}

export function useShortsQueue(demoMode: boolean): ShortsQueue {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [mode, setMode] = useState<"youtube" | "seed">("seed");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const seen = useRef<string[]>([]);
  const queriesRef = useRef<string[]>([]);
  const inflight = useRef(false);
  const generation = useRef(0);
  const demoRef = useRef(demoMode);
  useEffect(() => {
    demoRef.current = demoMode;
  }, [demoMode]);

  const remember = useCallback((items: VideoItem[]) => {
    for (const item of items) if (!seen.current.includes(item.id)) seen.current.push(item.id);
    if (seen.current.length > 600) seen.current = seen.current.slice(-400);
  }, []);

  const prime = useCallback(async (queries: string[], forceSeed = false) => {
    const gen = ++generation.current;
    queriesRef.current = queries;
    setLoading(true);
    setError("");
    try {
      let data: ShortsResponse;
      try {
        data = await requestShorts(queries, [], forceSeed || demoRef.current);
      } catch {
        data = await requestShorts(queries, [], true); // last-resort offline pool
      }
      if (gen !== generation.current) return false;
      seen.current = [];
      remember(data.videos);
      setVideos(data.videos);
      setMode(data.mode);
      setMessage(data.message ?? "");
      return data.videos.length > 0;
    } catch {
      if (gen === generation.current) setError("The feed could not be loaded. Check your connection and try again.");
      return false;
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [remember]);

  const loadMore = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    const gen = generation.current;
    try {
      const data = await requestShorts(queriesRef.current, seen.current, demoRef.current, 18);
      if (gen !== generation.current) return;
      const fresh = data.videos.filter((video) => !seen.current.includes(video.id));
      if (fresh.length === 0) return;
      remember(fresh);
      setVideos((current) => [...current, ...fresh]);
      setMode(data.mode);
      if (data.message) setMessage(data.message);
    } catch {
      /* keep the existing queue; the next scroll retries */
    } finally {
      inflight.current = false;
    }
  }, [remember]);

  const retune = useCallback(async (queries: string[], keepThrough: number) => {
    queriesRef.current = queries;
    try {
      const data = await requestShorts(queries, seen.current, demoRef.current, 18);
      const fresh = data.videos.filter((video) => !seen.current.includes(video.id));
      if (fresh.length < 3) return false;
      remember(fresh);
      setVideos((current) => [...current.slice(0, keepThrough + 1), ...fresh]);
      return true;
    } catch {
      return false;
    }
  }, [remember]);

  const drop = useCallback((id: string) => {
    setVideos((current) => current.filter((video) => video.id !== id));
  }, []);

  return { videos, mode, message, loading, error, prime, loadMore, retune, drop };
}
