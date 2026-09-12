import { shouldIncludeQuantityInCopy } from "@/lib/quantity";
import { weekdayLabel } from "@/lib/time/week";
import type { Slot } from "@/types/week";
import { displayTitle, formatSlotItem } from "./formatItem";
import type { MessageTemplateConfig } from "./types";

function mealTypeLabel(mealType: Slot["mealType"]): string {
  return mealType === "lunch" ? "Lunch" : "Dinner";
}

/** Wednesday lunch default plate: roti only (A10). */
export function isWednesdayLunchRotiOnly(slot: Slot): boolean {
  if (slot.weekday !== 3 || slot.mealType !== "lunch") {
    return false;
  }
  if (slot.items.length !== 1) {
    return false;
  }
  const only = slot.items[0];
  return only.kind === "roti";
}

export function formatItemsLine(slot: Slot, config: MessageTemplateConfig): string {
  if (isWednesdayLunchRotiOnly(slot)) {
    const roti = slot.items[0];
    if (shouldIncludeQuantityInCopy(roti.quantity)) {
      return `Roti only (Qty: ${roti.quantity})`;
    }
    return "Roti only";
  }

  return slot.items
    .map((item) => formatSlotItem(item, config))
    .join(config.itemSeparator);
}

function applyPlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

export type SlotRenderLines = {
  dayLine: string | null;
  mealLine: string;
  noteLine: string | null;
};

export function renderSlotLines(
  slot: Slot,
  config: MessageTemplateConfig,
  includeDayLine: boolean,
): SlotRenderLines {
  const items = formatItemsLine(slot, config);
  const mealLine = applyPlaceholders(config.mealLine, {
    day: weekdayLabel(slot.weekday),
    mealType: mealTypeLabel(slot.mealType),
    items,
    title: slot.items.map(displayTitle).join(config.itemSeparator),
    wording: "",
    qty: "",
    instructions: slot.instructions?.trim() ?? "",
  });

  const instructions = slot.instructions?.trim() ?? "";
  const noteLine =
    instructions.length > 0 && config.noteLine.trim().length > 0
      ? applyPlaceholders(config.noteLine, {
          instructions,
          day: weekdayLabel(slot.weekday),
          mealType: mealTypeLabel(slot.mealType),
          items,
          title: "",
          wording: "",
          qty: "",
        })
      : null;

  return {
    dayLine: includeDayLine ? weekdayLabel(slot.weekday) : null,
    mealLine,
    noteLine,
  };
}
