import { defaultQuantityForKind } from "@/lib/quantity";
import type { Meal } from "@/types/meal";
import type { SlotItem } from "@/types/week";

/** New item from catalog: catalog title, empty wording, type default qty (T5, C12). */
export function slotItemFromMeal(meal: Meal): SlotItem {
  return {
    mealId: meal.id,
    kind: meal.kind,
    title: meal.name,
    wording: "",
    quantity: defaultQuantityForKind(meal.kind),
  };
}
