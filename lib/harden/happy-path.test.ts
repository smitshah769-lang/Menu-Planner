/**
 * Automated coverage for edge case §10 (suggested test week).
 * Manual on Android Chrome still required for M1–M5, N6–N8, N11, clipboard on device (A4).
 */
import { describe, expect, it } from "vitest";
import { MEAL_BY_ID, MEALS } from "@/data/meals";
import {
  DEFAULT_DAL_QTY,
  DEFAULT_ROTI_QTY,
  DEFAULT_SUBJI_QTY,
  applyQuantities,
  parseQuantityString,
} from "@/lib/quantity";
import {
  approveAndCopyFullWeek,
  copyMessage,
  renderMessage,
} from "@/lib/message";
import { junkDinnerWeekday, generateWeek } from "@/lib/rules";
import {
  applySlotSuggestion,
  clearWeekSlot,
  generateMenu,
  updateSlotItem,
} from "@/lib/store";
import { createEmptyWeek } from "@/lib/time/week";
import type { Slot, Week } from "@/types/week";

const WEEK_START = "2026-08-31";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function slotOf(week: Week, weekday: number, mealType: "lunch" | "dinner"): Slot {
  const slot = week.slots.find(
    (candidate) => candidate.weekday === weekday && candidate.mealType === mealType,
  );
  if (!slot) {
    throw new Error("slot missing");
  }
  return slot;
}

function assertNotTableShaped(text: string): void {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    const pipeCells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    expect(pipeCells.length).toBeLessThan(3);
  }
}

describe("edge case §10 — suggested test week (happy path)", () => {
  it("generate once yields catalog-backed roti + subji + dal defaults with one junk night", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const week = generated.week;
    const junkWeekday = junkDinnerWeekday(WEEK_START);

    for (const slot of week.slots) {
      for (const item of slot.items) {
        expect(MEAL_BY_ID.has(item.mealId)).toBe(true);
      }
      const kinds = slot.items.map((item) => item.kind);
      if (slot.weekday === 3 && slot.mealType === "lunch") {
        expect(kinds).toEqual(["roti"]);
        expect(slot.items[0].quantity).toBe(DEFAULT_ROTI_QTY);
        continue;
      }
      if (slot.mealType === "dinner" && slot.weekday === junkWeekday) {
        expect(kinds).toEqual(["junk"]);
        continue;
      }
      expect(kinds.sort()).toEqual(["dal", "roti", "subji"].sort());
      expect(slot.items.find((i) => i.kind === "roti")?.quantity).toBe(DEFAULT_ROTI_QTY);
      expect(
        slot.items.find((i) => i.kind === "subji" && !i.paired)?.quantity,
      ).toBe(DEFAULT_SUBJI_QTY);
      expect(slot.items.find((i) => i.kind === "dal")?.quantity).toBe(DEFAULT_DAL_QTY);
    }

    const lunchOnlyIds = new Set(
      MEALS.filter((meal) => meal.lunchOnly).map((meal) => meal.id),
    );
    for (const slot of week.slots.filter((s) => s.mealType === "dinner")) {
      for (const item of slot.items) {
        expect(lunchOnlyIds.has(item.mealId)).toBe(false);
      }
    }

    const junkDinners = week.slots.filter(
      (slot) =>
        slot.mealType === "dinner" && slot.items.some((item) => item.kind === "junk"),
    );
    expect(junkDinners).toHaveLength(1);
    expect([5, 6]).toContain(junkDinners[0].weekday);

    const dals = week.slots.flatMap((slot) =>
      slot.items.filter((item) => item.kind === "dal"),
    );
    for (const dal of dals) {
      expect(dal.mealId).toBe("tuvar-dal");
    }
  });

  it("rejects qty above 20 and keeps cleared qty empty until re-entered", () => {
    const week = generateWeek(WEEK_START);
    const slot = slotOf(week, 1, "lunch");
    const rotiIndex = slot.items.findIndex((item) => item.kind === "roti");
    expect(parseQuantityString("21", 13)).toEqual({ quantity: 20, accepted: true });

    const cleared = updateSlotItem(week, slot.id, rotiIndex, { quantityInput: "" }, {
      storage: new MemoryStorage(),
    });
    const clearedSlot = slotOf(cleared, 1, "lunch");
    expect(clearedSlot.items[rotiIndex].quantity).toBeNull();

    const text = renderMessage(cleared, {
      type: "slots",
      slotIds: [slot.id],
    });
    expect(text).not.toMatch(/Roti.*\(Qty: 13\)/);
  });

  it("second manual subji sets both to qty 2", () => {
    const week = generateWeek(WEEK_START);
    const slot = slotOf(week, 2, "lunch");
    const withExtra = applyQuantities(
      {
        ...slot,
        items: [
          ...slot.items,
          {
            mealId: "vatana-bateta-nu-shaak",
            kind: "subji",
            title: "Vatana Bateta nu Shaak",
            wording: "",
            quantity: 3,
          },
        ],
      },
      "reconcile",
    );
    const manualSubjis = withExtra.items.filter(
      (item) => item.kind === "subji" && !item.paired,
    );
    expect(manualSubjis).toHaveLength(2);
    for (const item of manualSubjis) {
      expect(item.quantity).toBe(2);
    }
  });

  it("edited title and wording appear in copy; rules still use catalog mealId", async () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    let week = generated.week;
    const mondayLunch = slotOf(week, 1, "lunch");
    const subjiIndex = mondayLunch.items.findIndex(
      (item) => item.kind === "subji" && !item.paired,
    );
    week = updateSlotItem(
      week,
      mondayLunch.id,
      subjiIndex,
      { title: "Kobi special", wording: "less oil" },
      { storage },
    );
    const editedSlot = slotOf(week, 1, "lunch");
    expect(editedSlot.items[subjiIndex].mealId).not.toBe("kobi special");

    const copy = await copyMessage(week, {
      type: "slots",
      slotIds: [mondayLunch.id],
    });
    expect(copy.ok).toBe(true);
    if (!copy.ok) {
      return;
    }
    expect(copy.text).toContain("Kobi special");
    expect(copy.text).toContain("less oil");
    assertNotTableShaped(copy.text);
  });

  it("midweek: clear dinner, refill, copy only that slot", async () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const dinner = slotOf(generated.week, 4, "dinner");
    let week = clearWeekSlot(generated.week, dinner.id, { storage });
    expect(slotOf(week, 4, "dinner").slotStatus).toBe("UNDECIDED");

    week = applySlotSuggestion(week, dinner.id, MEAL_BY_ID.get("kobi-nu-shaak")!, {
      storage,
    });
    const copy = await copyMessage(week, {
      type: "slots",
      slotIds: [dinner.id],
    });
    expect(copy.ok).toBe(true);
    if (!copy.ok) {
      return;
    }
    expect(copy.text).toContain("Thursday");
    expect(copy.text).not.toContain("Monday");
    expect(copy.text).not.toContain("Friday");
    assertNotTableShaped(copy.text);
  });

  it("approve copies full plain-text week when all slots are decided", async () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const result = await approveAndCopyFullWeek(generated.week, null, { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.week.status).toBe("APPROVED");
    expect(result.text).toContain("Monday");
    expect(result.text).toContain("Sunday");
    assertNotTableShaped(result.text);
  });

  it("turya moong override adds tindora qty 1 in message", async () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const lunch = slotOf(generated.week, 1, "lunch");
    const week = applySlotSuggestion(
      generated.week,
      lunch.id,
      MEAL_BY_ID.get("turya-moong-dal")!,
      { storage },
    );
    const copy = await copyMessage(week, { type: "slots", slotIds: [lunch.id] });
    expect(copy.ok).toBe(true);
    if (!copy.ok) {
      return;
    }
    expect(copy.text).toContain("Tindora nu Shaak (Qty: 1)");
    expect(copy.text).toContain("Turya Moong Dal (Qty: 3)");
  });
});
