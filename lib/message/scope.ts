import type { Slot, Week } from "@/types/week";
import type { MessageCopyScope } from "./types";

function slotSortKey(slot: Slot): number {
  const mealOrder = slot.mealType === "lunch" ? 0 : 1;
  return slot.weekday * 2 + mealOrder;
}

export function slotsForScope(week: Week, scope: MessageCopyScope): Slot[] {
  if (scope.type === "fullWeek") {
    return [...week.slots].sort((a, b) => slotSortKey(a) - slotSortKey(b));
  }

  const idSet = new Set(scope.slotIds);
  const picked = week.slots.filter((slot) => idSet.has(slot.id));
  return picked.sort((a, b) => slotSortKey(a) - slotSortKey(b));
}
