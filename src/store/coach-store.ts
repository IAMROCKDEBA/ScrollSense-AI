"use client";

import { create } from "zustand";
import { executeCoachAction, type ActionContext } from "@/lib/ai/actions";
import { streamCoach } from "@/lib/ai/coach-client";
import type { CoachAction, CoachCard, CoachEvent } from "@/lib/ai/events";
import { buildSnapshot } from "@/lib/ai/snapshot";
import { createId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export interface ToolStep {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  summary?: string;
  ms?: number;
}

export interface ActionChip {
  id: string;
  label: string;
  action: CoachAction;
  undone: boolean;
  undo?: () => void;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  thinking: string;
  steps: ToolStep[];
  cards: CoachCard[];
  actions: ActionChip[];
  streaming: boolean;
  source?: "ai" | "offline";
  notice?: string;
  error?: string;
  meta?: { model: string; iterations: number; ms: number; stopReason: string; inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

interface CoachState {
  messages: ChatMessage[];
  busy: boolean;
  open: boolean;
  /** Breathing break requested by the coach (rendered by a global overlay). */
  breakSeconds: number;
  setOpen: (open: boolean) => void;
  setBreak: (seconds: number) => void;
  send: (text: string, ctx: Omit<ActionContext, "startBreak">) => Promise<void>;
  stop: () => void;
  clear: () => void;
  undoAction: (messageId: string, chipId: string) => void;
}

let controller: AbortController | null = null;

function patchLast(messages: ChatMessage[], patch: (message: ChatMessage) => ChatMessage): ChatMessage[] {
  const next = [...messages];
  const index = next.length - 1;
  if (index >= 0) next[index] = patch(next[index]);
  return next;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  messages: [],
  busy: false,
  open: false,
  breakSeconds: 0,
  setOpen: (open) => set({ open }),
  setBreak: (breakSeconds) => set({ breakSeconds }),

  send: async (rawText, ctx) => {
    const text = rawText.trim().slice(0, 1500);
    if (!text || get().busy) return;

    const userMessage: ChatMessage = { id: createId("m"), role: "user", text, thinking: "", steps: [], cards: [], actions: [], streaming: false };
    const assistant: ChatMessage = { id: createId("m"), role: "assistant", text: "", thinking: "", steps: [], cards: [], actions: [], streaming: true };
    const history = [...get().messages, userMessage]
      .filter((message) => message.text.trim())
      .slice(-16)
      .map((message) => ({ role: message.role, content: message.text.slice(0, 3900) }));

    set((state) => ({ messages: [...state.messages, userMessage, assistant], busy: true }));
    controller = new AbortController();

    const app = useAppStore.getState();
    const snapshot = buildSnapshot({
      profile: app.profile,
      sessions: app.sessions,
      moodLogs: app.moodLogs,
      cognitiveResult: app.cognitiveResult,
      dailyLimitMinutes: app.dailyLimitMinutes,
      commitments: app.commitments,
      demoPersona: app.demoPersona
    });

    const actionCtx: ActionContext = { ...ctx, startBreak: (seconds) => get().setBreak(seconds) };
    let usage = { input: 0, output: 0, cacheRead: 0 };

    const onEvent = (event: CoachEvent) => {
      switch (event.type) {
        case "text":
          set((state) => ({ messages: patchLast(state.messages, (m) => ({ ...m, text: m.text + event.delta })) }));
          break;
        case "thinking":
          set((state) => ({ messages: patchLast(state.messages, (m) => ({ ...m, thinking: m.thinking + event.delta })) }));
          break;
        case "tool_start":
          set((state) => ({
            messages: patchLast(state.messages, (m) => ({
              ...m,
              steps: m.steps.some((step) => step.id === event.id) ? m.steps : [...m.steps, { id: event.id, name: event.name, status: "running" }]
            }))
          }));
          break;
        case "tool_result":
          set((state) => ({
            messages: patchLast(state.messages, (m) => ({
              ...m,
              steps: m.steps.map((step) =>
                step.id === event.id ? { ...step, status: event.error ? "error" : "done", summary: event.summary, ms: event.ms } : step
              ),
              cards: event.card ? [...m.cards, event.card] : m.cards
            }))
          }));
          break;
        case "action": {
          const result = executeCoachAction(event.action, actionCtx);
          set((state) => ({
            messages: patchLast(state.messages, (m) => ({
              ...m,
              actions: [...m.actions, { id: event.id, label: event.label, action: event.action, undone: false, undo: result.undo }]
            }))
          }));
          break;
        }
        case "usage":
          usage = { input: event.inputTokens, output: event.outputTokens, cacheRead: event.cacheReadTokens };
          break;
        case "done":
          set((state) => ({
            messages: patchLast(state.messages, (m) => ({
              ...m,
              streaming: false,
              source: event.source,
              meta: { model: event.model, iterations: event.iterations, ms: event.ms, stopReason: event.stopReason, inputTokens: usage.input, outputTokens: usage.output, cacheReadTokens: usage.cacheRead }
            }))
          }));
          break;
        case "error":
          // A "no_key" error from the server is a notice (the offline coach follows); anything else is shown inline.
          set((state) => ({
            messages: patchLast(state.messages, (m) =>
              event.code === "no_key" ? { ...m, notice: event.message } : { ...m, error: event.message, streaming: false }
            )
          }));
          break;
        default:
      }
    };

    try {
      await streamCoach(history, snapshot, onEvent, controller.signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const message = error instanceof Error ? error.message : "The coach could not be reached.";
        set((state) => ({ messages: patchLast(state.messages, (m) => ({ ...m, error: message })) }));
      }
    } finally {
      controller = null;
      set((state) => ({ busy: false, messages: patchLast(state.messages, (m) => ({ ...m, streaming: false })) }));
    }
  },

  stop: () => controller?.abort(),

  clear: () => {
    controller?.abort();
    set({ messages: [], busy: false });
  },

  undoAction: (messageId, chipId) => {
    const chip = get().messages.find((message) => message.id === messageId)?.actions.find((item) => item.id === chipId);
    if (!chip || chip.undone) return;
    chip.undo?.();
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id !== messageId
          ? message
          : { ...message, actions: message.actions.map((item) => (item.id === chipId ? { ...item, undone: true } : item)) }
      )
    }));
  }
}));
