"use client";

import { create } from "zustand";
import type {
  CognitiveResult,
  MoodLog,
  RiskScore,
  UserProfile,
  VideoSession
} from "@/types";
import {
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
  saveCognitiveResult: (result: CognitiveResult) => void;
  saveRiskScore: (score: RiskScore) => void;
  setDemoMode: (value: boolean) => void;
  resetAll: () => void;
}

function persist(next: StoredAppData) {
  saveStoredData(next);
  return next;
}

function snapshot(state: AppState): StoredAppData {
  return {
    profile: state.profile,
    moodLogs: state.moodLogs,
    sessions: state.sessions,
    cognitiveResult: state.cognitiveResult,
    riskScore: state.riskScore,
    demoMode: state.demoMode
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  ...defaultStoredData,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ ...loadStoredData(), hydrated: true });
  },
  saveProfile: (profile) =>
    set((state) => persist({ ...snapshot(state), profile })),
  addMoodLog: (log) =>
    set((state) => persist({ ...snapshot(state), moodLogs: [...state.moodLogs, log] })),
  addSession: (session) =>
    set((state) => persist({ ...snapshot(state), sessions: [...state.sessions, session] })),
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
  saveRiskScore: (score) =>
    set((state) => persist({ ...snapshot(state), riskScore: score })),
  setDemoMode: (demoMode) =>
    set((state) => persist({ ...snapshot(state), demoMode })),
  resetAll: () => {
    clearStoredData();
    set({ ...defaultStoredData, hydrated: true });
  }
}));
