import { getMealById } from "@/lib/catalog";
import {
  PAIRED_TINDORA_QTY,
  applyQuantities,
  parseQuantityString,
} from "@/lib/quantity";
import { applySuggestion, clearSlot, generateWeek } from "@/lib/rules";
import type { Meal } from "@/types/meal";
import type { Slot, Week } from "@/types/week";
import { cloneWeek } from "./clone";
import { saveWeek, type PersistOptions } from "./persist";
import {
  allSlotsDecided,
  requiresGenerateConfirm,
  statusAfterEdit,
  undecidedSlotIds,
} from "./status";

export type GenerateMenuResult =
  | { ok: true; week: Week }
  | { ok: false; reason: "needs-confirm"; week: Week };

export type ApproveWeekResult =
  | { ok: true; week: Week }
  | { ok: false; undecidedSlotIds: string[] };

function persist(week: Week, options: PersistOptions): Week {
  return saveWeek(week, options);
}

function slotById(week: Week, slotId: string): Slot {
  const slot = week.slots.find((candidate) => candidate.id === slotId);
  if (!slot) {
    throw new Error(`Unknown slot ${slotId}`);
  }
  return slot;
}

function catalogTitle(mealId: string, fallback: string): string {
  return getMealById(mealId)?.name ?? fallback;
}

function withEditedStatus(week: Week): Week {
  week.status = statusAfterEdit(week.status);
  return week;
}

export function generateMenu(
  current: Week,
  options: PersistOptions & { confirm?: boolean } = {},
): GenerateMenuResult {
  if (requiresGenerateConfirm(current) && !options.confirm) {
    return { ok: false, reason: "needs-confirm", week: current };
  }
  const generated = generateWeek(current.weekStart);
  return { ok: true, week: persist(generated, options) };
}

export function applySlotSuggestion(
  week: Week,
  slotId: string,
  meal: Meal,
  options: PersistOptions = {},
): Week {
  const next = cloneWeek(week);
  const slot = slotById(next, slotId);
  const updated = applySuggestion(slot, meal);
  slot.items = updated.items;
  slot.slotStatus = updated.slotStatus;
  withEditedStatus(next);
  return persist(next, options);
}

export function clearWeekSlot(
  week: Week,
  slotId: string,
  options: PersistOptions = {},
): Week {
  const next = cloneWeek(week);
  const slot = slotById(next, slotId);
  const cleared = clearSlot(slot);
  slot.items = cleared.items;
  slot.slotStatus = cleared.slotStatus;
  withEditedStatus(next);
  return persist(next, options);
}

export type SlotItemPatch = {
  title?: string;
  wording?: string;
  quantityInput?: string;
};

export function updateSlotItem(
  week: Week,
  slotId: string,
  itemIndex: number,
  patch: SlotItemPatch,
  options: PersistOptions = {},
): Week {
  const next = cloneWeek(week);
  const slot = slotById(next, slotId);
  const item = slot.items[itemIndex];
  if (!item) {
    throw new Error(`Unknown item ${itemIndex} on slot ${slotId}`);
  }

  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    item.title = trimmed.length > 0 ? patch.title : catalogTitle(item.mealId, item.title);
  }
  if (patch.wording !== undefined) {
    item.wording = patch.wording;
  }
  if (patch.quantityInput !== undefined) {
    const parsed = parseQuantityString(patch.quantityInput, item.quantity);
    if (parsed.accepted) {
      item.quantity = parsed.quantity;
    }
    if (item.paired && item.kind === "subji") {
      item.quantity = PAIRED_TINDORA_QTY;
    }
  }

  withEditedStatus(next);
  return persist(next, options);
}

export function updateSlotInstructions(
  week: Week,
  slotId: string,
  instructions: string,
  options: PersistOptions = {},
): Week {
  const next = cloneWeek(week);
  const slot = slotById(next, slotId);
  const trimmed = instructions.trim();
  if (trimmed.length === 0) {
    delete slot.instructions;
  } else {
    slot.instructions = instructions;
  }
  withEditedStatus(next);
  return persist(next, options);
}

/** C15: drop an item; remaining items keep title/wording/qty. Empty slot → UNDECIDED. */
export function removeSlotItem(
  week: Week,
  slotId: string,
  itemIndex: number,
  options: PersistOptions = {},
): Week {
  const next = cloneWeek(week);
  const slot = slotById(next, slotId);
  slot.items = slot.items.filter((_, index) => index !== itemIndex);
  const reconciled = applyQuantities(slot, "reconcile");
  slot.items = reconciled.items;
  slot.slotStatus = slot.items.length === 0 ? "UNDECIDED" : "DECIDED";
  withEditedStatus(next);
  return persist(next, options);
}

export function approveWeek(
  week: Week,
  options: PersistOptions = {},
): ApproveWeekResult {
  if (!allSlotsDecided(week)) {
    return { ok: false, undecidedSlotIds: undecidedSlotIds(week) };
  }
  const next = cloneWeek(week);
  next.status = "APPROVED";
  return { ok: true, week: persist(next, options) };
}
