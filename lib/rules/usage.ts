import type { Week } from "@/types/week";

export function mealIdsUsedInWeek(week: Week, exceptSlotId?: string): Set<string> {
  const ids = new Set<string>();
  for (const slot of week.slots) {
    if (exceptSlotId && slot.id === exceptSlotId) {
      continue;
    }
    for (const item of slot.items) {
      ids.add(item.mealId);
    }
  }
  return ids;
}

export function weekendDinnerHasJunk(
  week: Week,
  weekday: 5 | 6,
): boolean {
  return week.slots.some(
    (slot) =>
      slot.weekday === weekday &&
      slot.mealType === "dinner" &&
      slot.items.some((item) => item.kind === "junk"),
  );
}
