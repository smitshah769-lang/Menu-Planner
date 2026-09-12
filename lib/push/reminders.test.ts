import { describe, expect, it } from "vitest";
import { IST_TIMEZONE } from "@/lib/time/week";
import type { UndecidedSnapshot } from "@/lib/store/snapshot";
import {
  buildDigestNotification,
  buildReminderKey,
  dueReminders,
} from "./reminders";

function snapshot(undecidedSlotIds: string[]): UndecidedSnapshot {
  return {
    weekStart: "2026-09-07",
    undecidedSlotIds,
    timezone: IST_TIMEZONE,
  };
}

describe("dueReminders (N1, N9, N13)", () => {
  it("fires same-day for undecided slots on today (morning window)", () => {
    const now = new Date("2026-09-10T03:00:00.000Z"); // 08:30 IST Wed
    const due = dueReminders(
      snapshot(["2026-09-10-lunch", "2026-09-10-dinner", "2026-09-11-lunch"]),
      now,
      "morning",
    );
    expect(due.map((item) => item.slotId).sort()).toEqual([
      "2026-09-10-dinner",
      "2026-09-10-lunch",
    ]);
    expect(due.every((item) => item.kind === "same-day")).toBe(true);
  });

  it("fires day-before for tomorrow slots (evening window)", () => {
    const now = new Date("2026-09-09T13:00:00.000Z"); // 18:30 IST Tue
    const due = dueReminders(
      snapshot(["2026-09-10-lunch", "2026-09-09-dinner"]),
      now,
      "evening",
    );
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      slotId: "2026-09-10-lunch",
      kind: "day-before",
    });
  });

  it("does not remind for past undecided slots (N9)", () => {
    const now = new Date("2026-09-11T03:00:00.000Z"); // Thu morning IST
    const due = dueReminders(
      snapshot(["2026-09-09-dinner"]),
      now,
      "morning",
    );
    expect(due).toHaveLength(0);
  });

  it("includes Wednesday lunch when undecided (N5)", () => {
    const now = new Date("2026-09-09T03:00:00.000Z"); // Wed 08:30 IST
    const due = dueReminders(snapshot(["2026-09-09-lunch"]), now, "morning");
    expect(due[0]?.label).toContain("Wednesday");
  });
});

describe("buildReminderKey (N12)", () => {
  it("is stable for duplicate cron runs", () => {
    const key = buildReminderKey("2026-09-10-lunch", "2026-09-10", "same-day");
    expect(key).toBe("2026-09-10-lunch:2026-09-10:same-day");
  });
});

describe("buildDigestNotification (N4)", () => {
  it("lists multiple slots in one body", () => {
    const { body } = buildDigestNotification(
      [
        {
          slotId: "2026-09-10-lunch",
          slotDate: "2026-09-10",
          kind: "same-day",
          label: "Wednesday Lunch",
        },
        {
          slotId: "2026-09-10-dinner",
          slotDate: "2026-09-10",
          kind: "same-day",
          label: "Wednesday Dinner",
        },
      ],
      "morning",
    );
    expect(body).toContain("Wednesday Lunch");
    expect(body).toContain("Wednesday Dinner");
  });
});
