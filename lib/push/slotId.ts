import { weekdayLabel } from "@/lib/time/week";
import type { MealType } from "@/types/week";

export function parseSlotId(
  slotId: string,
): { date: string; mealType: MealType } | null {
  const match = /^(\d{4}-\d{2}-\d{2})-(lunch|dinner)$/.exec(slotId);
  if (!match) {
    return null;
  }
  return { date: match[1], mealType: match[2] as MealType };
}

export function slotReminderLabel(slotId: string): string {
  const parsed = parseSlotId(slotId);
  if (!parsed) {
    return slotId;
  }
  const weekday = weekdayFromYmd(parsed.date);
  const meal =
    parsed.mealType === "lunch" ? "Lunch" : "Dinner";
  return `${weekdayLabel(weekday)} ${meal}`;
}

/** Weekday 1=Mon … 7=Sun for a calendar date (IST-neutral YYYY-MM-DD). */
export function weekdayFromYmd(ymd: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const name = utc.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const map: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const weekday = map[name];
  if (!weekday) {
    throw new Error(`Could not resolve weekday for ${ymd}`);
  }
  return weekday;
}
