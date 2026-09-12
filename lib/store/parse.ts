import { createEmptyWeek } from "@/lib/time/week";
import type { Slot, SlotItem, SlotStatus, Week, WeekStatus } from "@/types/week";

const WEEK_STATUSES: WeekStatus[] = [
  "NOT_CREATED",
  "GENERATED",
  "UNDER_REVIEW",
  "APPROVED",
];

const SLOT_STATUSES: SlotStatus[] = ["UNDECIDED", "DECIDED"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSlotItem(value: unknown): SlotItem | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.mealId !== "string" || typeof value.kind !== "string") {
    return null;
  }
  if (typeof value.title !== "string" || typeof value.wording !== "string") {
    return null;
  }
  if (value.quantity !== null && typeof value.quantity !== "number") {
    return null;
  }
  const item: SlotItem = {
    mealId: value.mealId,
    kind: value.kind as SlotItem["kind"],
    title: value.title,
    wording: value.wording,
    quantity: value.quantity,
  };
  if (value.paired === true) {
    item.paired = true;
  }
  return item;
}

function parseSlot(value: unknown): Slot | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.id !== "string" ||
    typeof value.date !== "string" ||
    typeof value.weekday !== "number" ||
    (value.mealType !== "lunch" && value.mealType !== "dinner") ||
    typeof value.slotStatus !== "string" ||
    !SLOT_STATUSES.includes(value.slotStatus as SlotStatus) ||
    !Array.isArray(value.items)
  ) {
    return null;
  }
  const items: SlotItem[] = [];
  for (const raw of value.items) {
    const item = parseSlotItem(raw);
    if (!item) {
      return null;
    }
    items.push(item);
  }
  const slot: Slot = {
    id: value.id,
    date: value.date,
    weekday: value.weekday as Slot["weekday"],
    mealType: value.mealType,
    items,
    slotStatus: value.slotStatus as SlotStatus,
  };
  if (typeof value.instructions === "string") {
    slot.instructions = value.instructions;
  }
  return slot;
}

export function parseWeekJson(raw: string, expectedWeekStart: string): Week {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) {
      return createEmptyWeek(expectedWeekStart);
    }
    if (value.weekStart !== expectedWeekStart) {
      return createEmptyWeek(expectedWeekStart);
    }
    if (
      typeof value.status !== "string" ||
      !WEEK_STATUSES.includes(value.status as WeekStatus) ||
      !Array.isArray(value.slots) ||
      value.slots.length !== 14
    ) {
      return createEmptyWeek(expectedWeekStart);
    }
    const slots: Slot[] = [];
    for (const rawSlot of value.slots) {
      const slot = parseSlot(rawSlot);
      if (!slot) {
        return createEmptyWeek(expectedWeekStart);
      }
      slots.push(slot);
    }
    return {
      weekStart: expectedWeekStart,
      status: value.status as WeekStatus,
      slots,
    };
  } catch {
    return createEmptyWeek(expectedWeekStart);
  }
}
