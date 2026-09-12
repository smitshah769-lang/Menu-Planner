import { weekdayLabel } from "@/lib/time/week";
import type { Slot } from "@/types/week";

export function slotShortLabel(slot: Slot): string {
  const meal =
    slot.mealType === "lunch"
      ? "Lunch"
      : slot.mealType === "dinner"
        ? "Dinner"
        : slot.mealType;
  return `${weekdayLabel(slot.weekday)} ${meal}`;
}
