import { addCalendarDays, getIstCalendarParts } from "@/lib/time/week";
import type { UndecidedSnapshot } from "@/lib/store/snapshot";
import { parseSlotId, slotReminderLabel } from "./slotId";

export type ReminderKind = "day-before" | "same-day";

export type CronWindow = "morning" | "evening";

export type DueReminder = {
  slotId: string;
  slotDate: string;
  kind: ReminderKind;
  label: string;
};

/** N12: stable key per slot timing. */
export function buildReminderKey(
  slotId: string,
  slotDate: string,
  kind: ReminderKind,
): string {
  return `${slotId}:${slotDate}:${kind}`;
}

/**
 * Morning IST run → same-day (N1). Evening IST run → day-before for tomorrow (N1).
 * N9: past slots never match. N10: NOT_CREATED weeks upload all slot ids as undecided.
 */
export function dueReminders(
  snapshot: UndecidedSnapshot,
  now: Date,
  window: CronWindow,
): DueReminder[] {
  const { ymd: today } = getIstCalendarParts(now);
  const tomorrow = addCalendarDays(today, 1);
  const due: DueReminder[] = [];

  for (const slotId of snapshot.undecidedSlotIds) {
    const parsed = parseSlotId(slotId);
    if (!parsed) {
      continue;
    }
    const { date: slotDate } = parsed;

    if (window === "morning" && slotDate === today) {
      due.push({
        slotId,
        slotDate,
        kind: "same-day",
        label: slotReminderLabel(slotId),
      });
    } else if (window === "evening" && slotDate === tomorrow) {
      due.push({
        slotId,
        slotDate,
        kind: "day-before",
        label: slotReminderLabel(slotId),
      });
    }
  }

  return due;
}

export function buildDigestNotification(
  due: DueReminder[],
  window: CronWindow,
): { title: string; body: string } {
  if (due.length === 0) {
    return { title: "", body: "" };
  }

  const lines = due.map((item) => `• ${item.label}`);
  const prefix =
    window === "morning"
      ? "Today’s menu still needs a decision:"
      : "Tomorrow’s menu still needs a decision:";

  return {
    title: "Menu planner",
    body: `${prefix}\n${lines.join("\n")}`,
  };
}
