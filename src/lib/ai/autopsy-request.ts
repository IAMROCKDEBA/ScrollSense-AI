import type { RiskScore, VideoSession } from "@/types";
import type { AutopsyRequest } from "./schemas";
import { toSessionSnapshot } from "./snapshot";

const MAX_VIEWS = 150;

/** Build the (size-capped, validated-on-the-server) payload for a session autopsy. */
export function toAutopsyRequest(session: VideoSession, risk: RiskScore | null, name?: string): AutopsyRequest {
  const all = session.views ?? [];
  const step = Math.max(1, Math.ceil(all.length / MAX_VIEWS));
  const views = all
    .filter((_, index) => index % step === 0)
    .map((view, index) => ({
      index,
      title: view.title.slice(0, 140),
      topic: view.topic?.slice(0, 80),
      dwellSec: Math.round((view.dwellMs / 1000) * 10) / 10,
      watchedSec: Math.round((view.watchedMs / 1000) * 10) / 10,
      completion: Math.round(view.completion * 100) / 100,
      loops: view.loops,
      skippedEarly: view.skippedEarly,
      liked: view.liked
    }));

  return {
    session: toSessionSnapshot(session),
    views,
    score: risk ? { addictionRiskScore: risk.addictionRiskScore, category: risk.finalRiskCategory, confidence: risk.confidence } : undefined,
    name
  };
}
