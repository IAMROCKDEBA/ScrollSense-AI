import type {
  CognitiveResult,
  MoodLog,
  RiskScore,
  UserProfile,
  VideoSession
} from "@/types";

const STORAGE_KEY = "scrollsense-ai-v1";

export interface StoredAppData {
  profile: UserProfile | null;
  moodLogs: MoodLog[];
  sessions: VideoSession[];
  cognitiveResult: CognitiveResult | null;
  riskScore: RiskScore | null;
  demoMode: boolean;
}

export const defaultStoredData: StoredAppData = {
  profile: null,
  moodLogs: [],
  sessions: [],
  cognitiveResult: null,
  riskScore: null,
  demoMode: false
};

function sanitizeStoredData(value: unknown): StoredAppData {
  if (!value || typeof value !== "object") return defaultStoredData;
  const record = value as Partial<StoredAppData>;

  return {
    profile: record.profile && typeof record.profile === "object" ? record.profile : null,
    moodLogs: Array.isArray(record.moodLogs) ? record.moodLogs : [],
    sessions: Array.isArray(record.sessions) ? record.sessions : [],
    cognitiveResult:
      record.cognitiveResult && typeof record.cognitiveResult === "object"
        ? record.cognitiveResult
        : null,
    riskScore: record.riskScore && typeof record.riskScore === "object" ? record.riskScore : null,
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

export function saveStoredData(data: StoredAppData) {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
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
