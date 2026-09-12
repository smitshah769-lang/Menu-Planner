import { getMealById } from "@/lib/catalog";
import { shouldIncludeQuantityInCopy } from "@/lib/quantity";
import type { SlotItem } from "@/types/week";
import type { MessageTemplateConfig } from "./types";

export function displayTitle(item: SlotItem): string {
  const trimmed = item.title.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return getMealById(item.mealId)?.name ?? item.title;
}

function qtyPart(item: SlotItem): string {
  if (!shouldIncludeQuantityInCopy(item.quantity)) {
    return "";
  }
  return ` (Qty: ${item.quantity})`;
}

function wordingPart(item: SlotItem): string {
  const trimmed = item.wording.trim();
  if (trimmed.length === 0) {
    return "";
  }
  return ` ${trimmed}`;
}

export function formatSlotItem(
  item: SlotItem,
  config: MessageTemplateConfig,
): string {
  const replacements: Record<string, string> = {
    title: displayTitle(item),
    qty: item.quantity === null ? "" : String(item.quantity),
    wording: item.wording.trim(),
    qtyPart: qtyPart(item),
    wordingPart: wordingPart(item),
  };
  return applyPlaceholders(config.itemFormat, replacements);
}

function applyPlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}
