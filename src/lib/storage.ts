import type {
  CognitiveResult,
  Commitment,
  MoodLog,
  RiskScore,
  UserProfile,
  VideoSession
} from "@/types";

/** Key is unchanged so existing v1 data is migrated in place rather than lost. */
const STORAGE_KEY = "scrollsense-ai-v1";
export const STORAGE_VERSION = 2;
export const MAX_SESSIONS = 120;
export const MAX_MOOD_LOGS = 400;
const STALE_UNFINISHED_MS = 1000 * 60 * 60 * 6;

export interface StoredAppData {
  version: number;
  profile: UserProfile | null;
  moodLogs: MoodLog[];
  sessions: VideoSession[];
  cognitiveResult: CognitiveResult | null;
  riskScore: RiskScore | null;
  /** Soft daily limit (minutes) set by the user or the Coach. */
  dailyLimitMinutes: number | null;
  commitments: Commitment[];
  /** True while the app holds generated demo-persona data. */
  demoPersona: boolean;
  /** Force the offline seeded Shorts pool (no YouTube API calls). */
  demoMode: boolean;
}

export const defaultStoredData: StoredAppData = {
  version: STORAGE_VERSION,
  profile: null,
  moodLogs: [],
  sessions: [],
  cognitiveResult: null,
  riskScore: null,
  dailyLimitMinutes: null,
  commitments: [],
  demoPersona: false,
  demoMode: false
};

/**
 * v1 -> v2: sessions gain `completed`. A v1 session counts as completed when it was
 * explicitly ended; abandoned ones (never ended, older than a few hours) are dropped
 * because they carry a placeholder urge score of 0 that used to pollute scoring.
 */
export function migrateSessions(sessions: VideoSession[], now = Date.now()): VideoSession[] {
  return sessions
    .filter((session) => session && typeof session === "object" && typeof session.id === "string")
    .map((session) => ({
      ...session,
      completed: session.completed ?? Boolean(session.endedAt)
    }))
    .filter((session) => {
      if (session.completed) return true;
      const started = Date.parse(session.startedAt);
      return Number.isFinite(started) && now - started < STALE_UNFINISHED_MS;
    })
    .slice(-MAX_SESSIONS);
}

export function sanitizeStoredData(value: unknown): StoredAppData {
  if (!value || typeof value !== "object") return defaultStoredData;
  const record = value as Partial<StoredAppData>;

  return {
    version: STORAGE_VERSION,
    profile: record.profile && typeof record.profile === "object" ? record.profile : null,
    moodLogs: Array.isArray(record.moodLogs) ? record.moodLogs.slice(-MAX_MOOD_LOGS) : [],
    sessions: Array.isArray(record.sessions) ? migrateSessions(record.sessions) : [],
    cognitiveResult:
      record.cognitiveResult && typeof record.cognitiveResult === "object"
        ? record.cognitiveResult
        : null,
    riskScore: record.riskScore && typeof record.riskScore === "object" ? record.riskScore : null,
    dailyLimitMinutes:
      typeof record.dailyLimitMinutes === "number" && Number.isFinite(record.dailyLimitMinutes)
        ? record.dailyLimitMinutes
        : null,
    commitments: Array.isArray(record.commitments) ? record.commitments.slice(-50) : [],
    demoPersona: typeof record.demoPersona === "boolean" ? record.demoPersona : false,
    demoMode: typeof record.demoMode === "boolean" ? record.demoMode : false
  };
}

function canUseLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const testKey = "__scrollsense_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadStoredData(): StoredAppData {
  if (!canUseLocalStorage()) return defaultStoredData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredData;
    return sanitizeStoredData(JSON.parse(raw));
  } catch {
    return defaultStoredData;
  }
}

/** Per-video telemetry is only kept for the most recent sessions; older ones keep their aggregates. */
export const KEEP_VIEWS_FOR = 10;

export function compactForStorage(data: StoredAppData, keepViewsFor = KEEP_VIEWS_FOR): StoredAppData {
  const cutoff = data.sessions.length - keepViewsFor;
  if (cutoff <= 0) return data;
  return {
    ...data,
    sessions: data.sessions.map((session, index) =>
      index < cutoff && session.views ? { ...session, views: undefined } : session
    )
  };
}

export function saveStoredData(data: StoredAppData) {
  if (!canUseLocalStorage()) return false;
  // Try the normal compaction first, then progressively harder if the browser quota is hit.
  for (const keep of [KEEP_VIEWS_FOR, 3, 0]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compactForStorage(data, keep)));
      return true;
    } catch {
      /* quota exceeded: retry with less telemetry */
    }
  }
  return false;
}

export function clearStoredData() {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
