import { applyQuantities } from "@/lib/quantity";
import type { Meal } from "@/types/meal";
import type { Slot } from "@/types/week";
import { slotItemFromMeal } from "./items";

/**
 * Apply a catalog suggestion to a slot (C12).
 * Plate kinds replace the matching item (or append). Junk / one-pot replace the whole slot.
 */
export function applySuggestion(slot: Slot, meal: Meal): Slot {
  const nextItem = slotItemFromMeal(meal);
  const overridePlate = meal.kind === "junk" || meal.kind === "other";

  const items = overridePlate
    ? [nextItem]
    : replaceOrAppendKind(slot, meal.kind, nextItem);

  const withItems: Slot = {
    ...slot,
    items,
    slotStatus: "DECIDED",
  };

  const trigger = overridePlate ? "generate" : "reconcile";
  return applyQuantities(withItems, trigger);
}

function replaceOrAppendKind(
  slot: Slot,
  kind: Meal["kind"],
  nextItem: ReturnType<typeof slotItemFromMeal>,
): Slot["items"] {
  const items = slot.items.map((item) => ({ ...item }));
  const index = items.findIndex((item) => {
    if (kind === "subji") {
      return item.kind === "subji" && !item.paired;
    }
    return item.kind === kind;
  });

  if (index >= 0) {
    items[index] = nextItem;
    return items;
  }

  items.push(nextItem);
  return items;
}

/** Clear dishes; slot becomes UNDECIDED so reminders can start (C13). */
export function clearSlot(slot: Slot): Slot {
  return {
    ...slot,
    items: [],
    slotStatus: "UNDECIDED",
  };
}
