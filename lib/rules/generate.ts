import { applyQuantities } from "@/lib/quantity";
import { createEmptyWeek } from "@/lib/time/week";
import type { Meal } from "@/types/meal";
import type { Slot, Week } from "@/types/week";
import { slotItemFromMeal } from "./items";
import {
  junkDinnerWeekday,
  pickDefaultRoti,
  pickGenerateDal,
  pickGenerateJunk,
  pickGenerateSubji,
} from "./pickers";

function finalizeSlot(slot: Slot, meals: Meal[]): Slot {
  const withItems: Slot = {
    ...slot,
    items: meals.map(slotItemFromMeal),
    instructions: undefined,
    slotStatus: "DECIDED",
  };
  return applyQuantities(withItems, "generate");
}

/**
 * Fill 14 slots for `weekStart` (Monday YYYY-MM-DD IST).
 * Overwrite confirmation is a UI concern (G2 / S4); this always returns a fresh GENERATED week.
 */
export function generateWeek(weekStart: string): Week {
  const week = createEmptyWeek(weekStart);
  const junkWeekday = junkDinnerWeekday(weekStart);
  const junkMeal = pickGenerateJunk(weekStart);
  const roti = pickDefaultRoti();
  const dal = pickGenerateDal();
  const subjiUsage = new Map<string, number>();

  const slots = week.slots.map((slot) => {
    const isWednesdayLunch = slot.weekday === 3 && slot.mealType === "lunch";
    const isJunkDinner =
      slot.mealType === "dinner" && slot.weekday === junkWeekday;

    if (isWednesdayLunch) {
      return finalizeSlot(slot, [roti]);
    }

    if (isJunkDinner) {
      return finalizeSlot(slot, [junkMeal]);
    }

    const subji = pickGenerateSubji(slot.mealType, subjiUsage);
    return finalizeSlot(slot, [roti, subji, dal]);
  });

  return {
    weekStart,
    status: "GENERATED",
    slots,
  };
}
