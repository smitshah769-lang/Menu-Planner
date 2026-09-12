import { describe, expect, it } from "vitest";
import { MEALS, MEAL_BY_ID } from "@/data/meals";
import {
  DEFAULT_DAL_QTY,
  DEFAULT_ROTI_QTY,
  DEFAULT_SUBJI_QTY,
  PAIRED_TINDORA_QTY,
  applyQuantities,
} from "@/lib/quantity";
import {
  applySuggestion,
  clearSlot,
  generateWeek,
  junkDinnerWeekday,
  passesHardFilters,
  preferJunkFirstWave,
  rankSuggestions,
  SUGGESTION_PAGE_SIZE,
  suggest,
} from "@/lib/rules";
import { addCalendarDays } from "@/lib/time/week";
import type { Meal } from "@/types/meal";
import type { Slot, Week } from "@/types/week";

const WEEK_START = "2026-08-31";

function mealById(id: string): Meal {
  const meal = MEAL_BY_ID.get(id);
  if (!meal) {
    throw new Error(`Missing meal ${id}`);
  }
  return meal;
}

function weekStartWithJunkOn(weekday: 5 | 6): string {
  for (let i = 0; i < 20; i += 1) {
    const start = addCalendarDays(WEEK_START, i * 7);
    if (junkDinnerWeekday(start) === weekday) {
      return start;
    }
  }
  throw new Error("Could not find a weekStart with the requested junk night");
}

function slotOf(week: Week, weekday: number, mealType: "lunch" | "dinner"): Slot {
  const slot = week.slots.find(
    (candidate) => candidate.weekday === weekday && candidate.mealType === mealType,
  );
  if (!slot) {
    throw new Error("Missing slot");
  }
  return slot;
}

describe("hard filters", () => {
  it("keeps catalog dishes and drops plain rice (G22, G23)", () => {
    expect(passesHardFilters(mealById("kobi-nu-shaak"), "dinner")).toBe(true);
    expect(passesHardFilters(mealById("gujarati-khichdi"), "dinner")).toBe(true);
    expect(passesHardFilters(mealById("vegetable-pulao"), "lunch")).toBe(true);
    expect(passesHardFilters(mealById("gujarati-vagharelo-bhaat"), "lunch")).toBe(
      false,
    );
    expect(
      passesHardFilters(mealById("veg-schezwan-fried-rice"), "dinner"),
    ).toBe(false);
  });

  it("never allows lunch-only dishes at dinner (G7, C2)", () => {
    expect(passesHardFilters(mealById("choli-nu-shaak"), "lunch")).toBe(true);
    expect(passesHardFilters(mealById("choli-nu-shaak"), "dinner")).toBe(false);
    expect(passesHardFilters(mealById("bhinda-nu-shaak"), "dinner")).toBe(false);
    expect(passesHardFilters(mealById("bharwa-bhinda"), "dinner")).toBe(false);
  });
});

describe("generateWeek", () => {
  const week = generateWeek(WEEK_START);

  it("fills 14 decided slots and marks GENERATED (G1)", () => {
    expect(week.slots).toHaveLength(14);
    expect(week.status).toBe("GENERATED");
    expect(week.slots.every((slot) => slot.slotStatus === "DECIDED")).toBe(true);
    expect(week.slots.every((slot) => slot.items.length > 0)).toBe(true);
  });

  it("uses roti + subji + dal except Wednesday lunch and one junk dinner (G19)", () => {
    const junkWeekday = junkDinnerWeekday(WEEK_START);
    for (const slot of week.slots) {
      const kinds = slot.items.map((item) => item.kind);
      if (slot.weekday === 3 && slot.mealType === "lunch") {
        expect(kinds).toEqual(["roti"]);
        continue;
      }
      if (slot.mealType === "dinner" && slot.weekday === junkWeekday) {
        expect(kinds).toEqual(["junk"]);
        continue;
      }
      expect(kinds.sort()).toEqual(["dal", "roti", "subji"].sort());
    }
  });

  it("keeps Wednesday lunch as roti only (G6, G14)", () => {
    const wedLunch = slotOf(week, 3, "lunch");
    expect(wedLunch.items).toHaveLength(1);
    expect(wedLunch.items[0].mealId).toBe("roti-phulka");
    expect(wedLunch.items[0].quantity).toBe(DEFAULT_ROTI_QTY);
    expect(wedLunch.items[0].wording).toBe("");
  });

  it("picks exactly one Friday or Saturday junk dinner (G8, G9)", () => {
    const dinners = week.slots.filter((slot) => slot.mealType === "dinner");
    const junkDinners = dinners.filter((slot) =>
      slot.items.some((item) => item.kind === "junk"),
    );
    expect(junkDinners).toHaveLength(1);
    expect([5, 6]).toContain(junkDinners[0].weekday);
    expect(junkDinners[0].items).toHaveLength(1);
    const junkMeal = mealById(junkDinners[0].items[0].mealId);
    expect(["Pav Bhaji", "Ragda Pattice"]).toContain(junkMeal.name);
  });

  it("is stable for a given weekStart", () => {
    const again = generateWeek(WEEK_START);
    expect(again.slots.map((slot) => slot.items.map((i) => i.mealId))).toEqual(
      week.slots.map((slot) => slot.items.map((i) => i.mealId)),
    );
  });

  it("never auto-picks rajma or chole (G11)", () => {
    for (const slot of week.slots) {
      for (const item of slot.items) {
        const name = item.title.toLowerCase();
        expect(name.includes("rajma") || name.includes("chole")).toBe(false);
      }
    }
  });

  it("never uses fansi as a lunch default (G20)", () => {
    for (const slot of week.slots.filter((s) => s.mealType === "lunch")) {
      expect(slot.items.some((item) => item.mealId === "fansi-nu-shaak")).toBe(
        false,
      );
    }
  });

  it("never places choli or bhinda at dinner (G7, G13)", () => {
    const lunchOnly = new Set([
      "choli-nu-shaak",
      "bhinda-nu-shaak",
      "bharwa-bhinda",
    ]);
    for (const slot of week.slots.filter((s) => s.mealType === "dinner")) {
      for (const item of slot.items) {
        expect(lunchOnly.has(item.mealId)).toBe(false);
      }
    }
  });

  it("uses Tuvar Dal, never turya moong (G24, G10)", () => {
    const dals = week.slots.flatMap((slot) =>
      slot.items.filter((item) => item.kind === "dal"),
    );
    expect(dals.length).toBeGreaterThan(0);
    for (const dal of dals) {
      expect(dal.mealId).toBe("tuvar-dal");
      expect(dal.mealId).not.toBe("turya-moong-dal");
    }
  });

  it("never generates khichdi, pulao, or excluded rice (G4, G5, G23)", () => {
    const blocked = new Set(
      MEALS.filter(
        (meal) =>
          meal.excludePlainRice ||
          meal.name.toLowerCase().includes("khichdi") ||
          meal.name.toLowerCase().includes("pulao"),
      ).map((meal) => meal.id),
    );
    for (const slot of week.slots) {
      for (const item of slot.items) {
        expect(blocked.has(item.mealId)).toBe(false);
        expect(MEAL_BY_ID.has(item.mealId)).toBe(true);
      }
    }
  });

  it("applies quantity defaults on generate (Q8)", () => {
    const mondayLunch = slotOf(week, 1, "lunch");
    expect(mondayLunch.items.find((i) => i.kind === "roti")?.quantity).toBe(
      DEFAULT_ROTI_QTY,
    );
    expect(
      mondayLunch.items.find((i) => i.kind === "subji" && !i.paired)?.quantity,
    ).toBe(DEFAULT_SUBJI_QTY);
    expect(mondayLunch.items.find((i) => i.kind === "dal")?.quantity).toBe(
      DEFAULT_DAL_QTY,
    );
  });
});

describe("suggest", () => {
  it("returns lunch suggestions for Wednesday roti-only (C1)", () => {
    const week = generateWeek(WEEK_START);
    const wedLunch = slotOf(week, 3, "lunch");
    const first = suggest({ slot: wedLunch, week, wave: "first" });
    expect(first.length).toBe(SUGGESTION_PAGE_SIZE);
    expect(first.some((row) => row.meal.kind === "subji")).toBe(true);
    expect(first.every((row) => passesHardFilters(row.meal, "lunch"))).toBe(
      true,
    );
  });

  it("does not put junk in the first wave when the other weekend dinner is already junk (C3, C4)", () => {
    const fridayJunkStart = weekStartWithJunkOn(5);
    const week = generateWeek(fridayJunkStart);
    const saturdayDinner = slotOf(week, 6, "dinner");
    expect(preferJunkFirstWave(saturdayDinner, week)).toBe(false);
    const first = suggest({ slot: saturdayDinner, week, wave: "first" });
    expect(first.every((row) => row.meal.kind !== "junk")).toBe(true);

    const saturdayJunkStart = weekStartWithJunkOn(6);
    const weekSat = generateWeek(saturdayJunkStart);
    const fridayDinner = slotOf(weekSat, 5, "dinner");
    expect(
      suggest({ slot: fridayDinner, week: weekSat, wave: "first" }).every(
        (row) => row.meal.kind !== "junk",
      ),
    ).toBe(true);
  });

  it("keeps rajma/chole, fansi-at-lunch, and turya out of first wave (C8, G20, G24)", () => {
    const week = generateWeek(WEEK_START);
    const lunch = slotOf(week, 2, "lunch");
    const first = suggest({ slot: lunch, week, wave: "first" });
    for (const row of first) {
      const name = row.meal.name.toLowerCase();
      expect(name.includes("chole") || name.includes("rajma")).toBe(false);
      expect(row.meal.id).not.toBe("fansi-nu-shaak");
      expect(row.meal.id).not.toBe("turya-moong-dal");
      expect(row.meal.excludePlainRice).toBe(false);
    }
  });

  it("does not suggest lunch-only dishes for dinner (C2)", () => {
    const week = generateWeek(WEEK_START);
    const dinner = slotOf(week, 2, "dinner");
    const ranked = rankSuggestions(dinner, week);
    expect(
      ranked.some((meal) => meal.lunchOnly || meal.id === "choli-nu-shaak"),
    ).toBe(false);
  });

  it("returns empty when more pages are exhausted (C10)", () => {
    const week = generateWeek(WEEK_START);
    const lunch = slotOf(week, 1, "lunch");
    const ranked = rankSuggestions(lunch, week);
    const lastPage = Math.floor((ranked.length - 1) / SUGGESTION_PAGE_SIZE);
    const exhausted = suggest({
      slot: lunch,
      week,
      wave: "more",
      page: lastPage + 1,
    });
    expect(exhausted).toEqual([]);
    const firstPageOfMore = suggest({ slot: lunch, week, wave: "more" });
    const first = suggest({ slot: lunch, week, wave: "first" });
    expect(firstPageOfMore.map((row) => row.meal.id)).not.toEqual(
      first.map((row) => row.meal.id),
    );
  });

  it("flags dishes already used this week but still returns them (C11)", () => {
    const week = generateWeek(WEEK_START);
    const tuesdayDinner = slotOf(week, 2, "dinner");
    const usedIds = new Set(
      week.slots
        .filter((slot) => slot.id !== tuesdayDinner.id)
        .flatMap((slot) => slot.items.map((item) => item.mealId)),
    );
    const ranked = rankSuggestions(tuesdayDinner, week);
    const usedSuggestion = ranked.find((meal) => usedIds.has(meal.id));
    expect(usedSuggestion).toBeDefined();
    const page = Math.floor(
      ranked.findIndex((meal) => meal.id === usedSuggestion!.id) /
        SUGGESTION_PAGE_SIZE,
    );
    const wave = page === 0 ? "first" : "more";
    const rows = suggest({
      slot: tuesdayDinner,
      week,
      wave,
      page,
    });
    const flagged = rows.find((row) => row.meal.id === usedSuggestion!.id);
    expect(flagged?.alreadyUsedThisWeek).toBe(true);
  });

  it("includes khichdi/pulao as override options after first wave (C14)", () => {
    const week = generateWeek(WEEK_START);
    const dinner = slotOf(week, 2, "dinner");
    const ranked = rankSuggestions(dinner, week);
    const firstIds = new Set(
      suggest({ slot: dinner, week, wave: "first" }).map((row) => row.meal.id),
    );
    const khichdi = ranked.find((meal) => meal.id === "gujarati-khichdi");
    expect(khichdi).toBeDefined();
    expect(firstIds.has("gujarati-khichdi")).toBe(false);
  });
});

describe("applySuggestion and clearSlot", () => {
  it("selects turya moong dal and pairs tindora qty 1 (G21)", () => {
    const week = generateWeek(WEEK_START);
    const slot = slotOf(week, 1, "lunch");
    const next = applySuggestion(slot, mealById("turya-moong-dal"));
    expect(next.slotStatus).toBe("DECIDED");
    expect(next.items.find((item) => item.mealId === "turya-moong-dal")?.quantity).toBe(
      DEFAULT_DAL_QTY,
    );
    const paired = next.items.find((item) => item.paired);
    expect(paired?.mealId).toBe("tindora-nu-shaak");
    expect(paired?.quantity).toBe(PAIRED_TINDORA_QTY);
    expect(paired?.title).toBe("Tindora nu Shaak");
    expect(
      next.items.find((item) => item.kind === "subji" && !item.paired)?.quantity,
    ).toBe(DEFAULT_SUBJI_QTY);
  });

  it("keeps pairing at qty 1 when a second manual subji would trigger Q12", () => {
    const week = generateWeek(WEEK_START);
    const slot = slotOf(week, 1, "lunch");
    const withTurya = applySuggestion(slot, mealById("turya-moong-dal"));
    const withSecondSubji = applyQuantitiesLikeSecondSubji(withTurya);
    const paired = withSecondSubji.items.find((item) => item.paired);
    expect(paired?.quantity).toBe(1);
    const manual = withSecondSubji.items.filter(
      (item) => item.kind === "subji" && !item.paired,
    );
    expect(manual.length).toBeGreaterThanOrEqual(2);
    for (const item of manual) {
      expect(item.quantity).toBe(2);
    }
  });

  it("resets a new dish to catalog title, empty wording, and type default (C12)", () => {
    const week = generateWeek(WEEK_START);
    const slot = slotOf(week, 4, "dinner");
    const next = applySuggestion(slot, mealById("kobi-nu-shaak"));
    const subji = next.items.find((item) => item.kind === "subji" && !item.paired);
    expect(subji?.title).toBe("Kobi nu Shaak (Kobi subji)");
    expect(subji?.wording).toBe("");
    expect(subji?.quantity).toBe(DEFAULT_SUBJI_QTY);
  });

  it("replaces a junk night with a one-pot override without forced qty (C14, Q4)", () => {
    const start = weekStartWithJunkOn(5);
    const week = generateWeek(start);
    const fridayDinner = slotOf(week, 5, "dinner");
    const next = applySuggestion(fridayDinner, mealById("gujarati-khichdi"));
    expect(next.items).toHaveLength(1);
    expect(next.items[0].mealId).toBe("gujarati-khichdi");
    expect(next.items[0].quantity).toBeNull();
  });

  it("clears a slot to UNDECIDED (C13)", () => {
    const week = generateWeek(WEEK_START);
    const slot = slotOf(week, 7, "dinner");
    const cleared = clearSlot(slot);
    expect(cleared.items).toEqual([]);
    expect(cleared.slotStatus).toBe("UNDECIDED");
  });
});

function applyQuantitiesLikeSecondSubji(slot: Slot): Slot {
  const extra = {
    mealId: "vatana-bateta-nu-shaak",
    kind: "subji" as const,
    title: "Vatana Bateta nu Shaak",
    wording: "",
    quantity: 3,
  };
  return applyQuantities(
    {
      ...slot,
      items: [...slot.items, extra],
    },
    "reconcile",
  );
}
