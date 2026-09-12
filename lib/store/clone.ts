import type { Week } from "@/types/week";

export function cloneWeek(week: Week): Week {
  return {
    weekStart: week.weekStart,
    status: week.status,
    slots: week.slots.map((slot) => ({
      ...slot,
      items: slot.items.map((item) => ({ ...item })),
    })),
  };
}
