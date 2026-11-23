"use client";

import { create } from "zustand";
import type {
  CognitiveResult,
  Commitment,
  MoodLog,
  RiskScore,
  UserProfile,
  VideoSession
} from "@/types";
import {
  MAX_MOOD_LOGS,
  MAX_SESSIONS,
  clearStoredData,
  defaultStoredData,
  loadStoredData,
  saveStoredData,
  type StoredAppData
} from "@/lib/storage";

interface AppState extends StoredAppData {
  hydrated: boolean;
  hydrate: () => void;
  saveProfile: (profile: UserProfile) => void;
  addMoodLog: (log: MoodLog) => void;
  addSession: (session: VideoSession) => void;
  /** Merge fields into an existing session (e.g. attach an Autopsy). */
  patchSession: (id: string, patch: Partial<VideoSession>) => void;
  saveCognitiveResult: (result: CognitiveResult) => void;
  saveRiskScore: (score: RiskScore) => void;
  setDemoMode: (value: boolean) => void;
  setDailyLimit: (minutes: number | null) => void;
  addCommitment: (commitment: Commitment) => void;
  toggleCommitment: (id: string) => void;
  removeCommitment: (id: string) => void;
  /** Replace profile/sessions/moods with generated persona data. */
  loadPersona: (data: Pick<StoredAppData, "profile" | "sessions" | "moodLogs" | "cognitiveResult">) => void;
  resetAll: () => void;
}

function persist(next: StoredAppData) {
  saveStoredData(next);
  return next;
}

function snapshot(state: AppState): StoredAppData {
  return {
    version: state.version,
    profile: state.profile,
    moodLogs: state.moodLogs,
    sessions: state.sessions,
    cognitiveResult: state.cognitiveResult,
    riskScore: state.riskScore,
    dailyLimitMinutes: state.dailyLimitMinutes,
    commitments: state.commitments,
    demoPersona: state.demoPersona,
    demoMode: state.demoMode
  };
}

function upsertSession(sessions: VideoSession[], session: VideoSession) {
  const existingIndex = sessions.findIndex((item) => item.id === session.id);
  if (existingIndex === -1) return [...sessions, session].slice(-MAX_SESSIONS);

  const nextSessions = [...sessions];
  nextSessions[existingIndex] = session;
  return nextSessions;
}

export const useAppStore = create<AppState>((set, get) => ({
  ...defaultStoredData,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ ...loadStoredData(), hydrated: true });
  },
  saveProfile: (profile) => set((state) => persist({ ...snapshot(state), profile })),
  addMoodLog: (log) =>
    set((state) =>
      persist({ ...snapshot(state), moodLogs: [...state.moodLogs, log].slice(-MAX_MOOD_LOGS) })
    ),
  addSession: (session) =>
    set((state) => persist({ ...snapshot(state), sessions: upsertSession(state.sessions, session) })),
  patchSession: (id, patch) =>
    set((state) =>
      persist({
        ...snapshot(state),
        sessions: state.sessions.map((item) => (item.id === id ? { ...item, ...patch } : item))
      })
    ),
  saveCognitiveResult: (result) =>
    set((state) =>
      persist({
        ...snapshot(state),
        cognitiveResult: {
          ...(state.cognitiveResult ?? {}),
          ...result,
          updatedAt: new Date().toISOString()
        }
      })
    ),
  saveRiskScore: (score) => set((state) => persist({ ...snapshot(state), riskScore: score })),
  setDemoMode: (demoMode) => set((state) => persist({ ...snapshot(state), demoMode })),
  setDailyLimit: (dailyLimitMinutes) =>
    set((state) => persist({ ...snapshot(state), dailyLimitMinutes })),
  addCommitment: (commitment) =>
    set((state) =>
      persist({ ...snapshot(state), commitments: [...state.commitments, commitment].slice(-50) })
    ),
  toggleCommitment: (id) =>
    set((state) =>
      persist({
        ...snapshot(state),
        commitments: state.commitments.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item
        )
      })
    ),
  removeCommitment: (id) =>
    set((state) =>
      persist({ ...snapshot(state), commitments: state.commitments.filter((item) => item.id !== id) })
    ),
  loadPersona: (data) =>
    set((state) =>
      persist({
        ...snapshot(state),
        ...data,
        riskScore: null,
        demoPersona: true
      })
    ),
  resetAll: () => {
    clearStoredData();
    set({ ...defaultStoredData, hydrated: true });
  }
}));
