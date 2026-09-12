import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  createEmptyWeek,
  decidedCount,
  formatWeekRange,
  getCurrentWeekStart,
  getIstCalendarParts,
  slotCalendarDate,
} from "./week";

describe("IST week helpers", () => {
  it("reads the Asia/Kolkata calendar date, not UTC (N13)", () => {
    // 2026-08-31 22:30 UTC is 2026-09-01 04:00 IST (Tuesday).
    const instant = new Date("2026-08-31T22:30:00.000Z");
    const parts = getIstCalendarParts(instant);
    expect(parts.ymd).toBe("2026-09-01");
    expect(parts.weekday).toBe(2);
    expect(instant.toISOString().slice(0, 10)).toBe("2026-08-31");
  });

  it("returns Monday of the current IST week (G16)", () => {
    const tuesdayIst = new Date("2026-08-31T22:30:00.000Z");
    expect(getCurrentWeekStart(tuesdayIst)).toBe("2026-08-31");
  });

  it("starts a new empty week on Monday IST, not UTC Sunday (S6)", () => {
    const sundayEveningIst = new Date("2026-09-06T18:20:00.000Z"); // 23:50 IST Sunday
    expect(getCurrentWeekStart(sundayEveningIst)).toBe("2026-08-31");

    const mondayJustAfterMidnightIst = new Date("2026-09-06T18:40:00.000Z"); // 00:10 IST Monday
    expect(getCurrentWeekStart(mondayJustAfterMidnightIst)).toBe("2026-09-07");
  });

  it("maps weekday 1–7 onto dates from weekStart", () => {
    expect(slotCalendarDate("2026-08-31", 1)).toBe("2026-08-31");
    expect(slotCalendarDate("2026-08-31", 3)).toBe("2026-09-02");
    expect(slotCalendarDate("2026-08-31", 7)).toBe("2026-09-06");
  });

  it("adds calendar days without UTC shifting the ymd", () => {
    expect(addCalendarDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("formats the Mon–Sun range", () => {
    expect(formatWeekRange("2026-08-31")).toBe("31 Aug – 6 Sep 2026");
  });

  it("builds 14 undecided slots for NOT_CREATED", () => {
    const week = createEmptyWeek("2026-08-31");
    expect(week.status).toBe("NOT_CREATED");
    expect(week.slots).toHaveLength(14);
    expect(decidedCount(week)).toBe(0);
    expect(week.slots[0]).toMatchObject({
      id: "2026-08-31-lunch",
      mealType: "lunch",
      weekday: 1,
    });
    expect(week.slots[13]).toMatchObject({
      id: "2026-09-06-dinner",
      mealType: "dinner",
      weekday: 7,
    });
  });
});
