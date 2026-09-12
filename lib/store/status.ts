import type { Week, WeekStatus } from "@/types/week";

/**
 * Any item/slot edit moves GENERATED or APPROVED to UNDER_REVIEW (A5).
 * Editing a NOT_CREATED week starts review (user filled slots without Generate).
 */
export function statusAfterEdit(status: WeekStatus): WeekStatus {
  if (
    status === "GENERATED" ||
    status === "APPROVED" ||
    status === "NOT_CREATED"
  ) {
    return "UNDER_REVIEW";
  }
  return status;
}

/** G2 / S4: overwrite an existing week only after confirm. */
export function requiresGenerateConfirm(week: Week): boolean {
  return week.status !== "NOT_CREATED";
}

export function undecidedSlotIds(week: Week): string[] {
  if (week.status === "NOT_CREATED") {
    return week.slots.map((slot) => slot.id);
  }
  return week.slots
    .filter((slot) => slot.slotStatus === "UNDECIDED")
    .map((slot) => slot.id);
}

export function allSlotsDecided(week: Week): boolean {
  return (
    week.status !== "NOT_CREATED" &&
    week.slots.length === 14 &&
    week.slots.every((slot) => slot.slotStatus === "DECIDED")
  );
}
