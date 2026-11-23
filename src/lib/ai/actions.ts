import { createId } from "@/lib/utils";
import { savePendingIntent } from "@/lib/pending-intent";
import { useAppStore } from "@/store/app-store";
import type { CoachAction } from "./events";

export interface ActionContext {
  navigate: (path: string) => void;
  startBreak: (seconds: number) => void;
}

export interface ActionResult {
  /** Present when the change can be reverted. */
  undo?: () => void;
}

/** Executes an action requested by the Coach in the browser. Every state-changing action is undoable. */
export function executeCoachAction(action: CoachAction, ctx: ActionContext): ActionResult {
  const store = useAppStore.getState();

  switch (action.type) {
    case "navigate":
      ctx.navigate(action.path);
      return {};
    case "start_breathing_break":
      ctx.startBreak(action.seconds);
      return {};
    case "set_daily_limit": {
      const previous = store.dailyLimitMinutes;
      store.setDailyLimit(action.minutes);
      return { undo: () => useAppStore.getState().setDailyLimit(previous) };
    }
    case "save_commitment": {
      const id = createId("commit");
      store.addCommitment({ id, text: action.text, createdAt: new Date().toISOString(), done: false });
      return { undo: () => useAppStore.getState().removeCommitment(id) };
    }
    case "start_intent_feed":
      savePendingIntent({ goal: action.goal, minutes: action.minutes });
      ctx.navigate("/feed");
      return {};
    case "launch_cognitive_test":
      ctx.navigate("/tests");
      return {};
    default:
      return {};
  }
}
