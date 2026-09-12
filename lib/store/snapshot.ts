import { IST_TIMEZONE } from "@/lib/time/week";
import type { Week } from "@/types/week";
import { undecidedSlotIds } from "./status";

export type UndecidedSnapshot = {
  weekStart: string;
  undecidedSlotIds: string[];
  timezone: typeof IST_TIMEZONE;
};

export type ReminderBridge = {
  upsertSnapshot: (snapshot: UndecidedSnapshot) => void | Promise<void>;
};

/** Default when no bridge is passed (tests, SSR). Client uses `pushReminderBridge`. */
export const noopReminderBridge: ReminderBridge = {
  upsertSnapshot: () => undefined,
};

export function buildUndecidedSnapshot(week: Week): UndecidedSnapshot {
  return {
    weekStart: week.weekStart,
    undecidedSlotIds: undecidedSlotIds(week),
    timezone: IST_TIMEZONE,
  };
}
