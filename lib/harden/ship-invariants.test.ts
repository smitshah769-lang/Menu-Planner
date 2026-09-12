import { describe, expect, it } from "vitest";
import { MEAL_BY_ID } from "@/data/meals";
import { renderMessage } from "@/lib/message";
import { generateWeek, junkDinnerWeekday } from "@/lib/rules";
import { addCalendarDays } from "@/lib/time/week";

const BASE_WEEK = "2026-08-31";

describe("Phase 8 ship invariants", () => {
  it("generate never invents dishes across several week starts (G22)", () => {
    for (let offset = 0; offset < 8; offset += 1) {
      const weekStart = addCalendarDays(BASE_WEEK, offset * 7);
      const week = generateWeek(weekStart);
      expect(week.slots).toHaveLength(14);
      for (const slot of week.slots) {
        for (const item of slot.items) {
          expect(MEAL_BY_ID.has(item.mealId)).toBe(true);
        }
      }
      const junkNights = week.slots.filter(
        (slot) =>
          slot.mealType === "dinner" &&
          slot.items.some((item) => item.kind === "junk"),
      );
      expect(junkNights).toHaveLength(1);
      expect(junkNights[0].weekday).toBe(junkDinnerWeekday(weekStart));
    }
  });

  it("full-week copy is chat-style plain text, not a table (A3)", () => {
    const week = generateWeek(BASE_WEEK);
    const text = renderMessage(week, { type: "fullWeek" });
    expect(text.length).toBeGreaterThan(100);
    const tableLike = text
      .split("\n")
      .filter((line) => {
        const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
        return cells.length >= 3;
      });
    expect(tableLike).toEqual([]);
  });
});
