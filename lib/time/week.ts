import type { MealType, Slot, Week, Weekday } from "@/types/week";

export const IST_TIMEZONE = "Asia/Kolkata";

const WEEKDAY_FROM_SHORT: Record<string, Weekday> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function getIstCalendarParts(now: Date): {
  year: number;
  month: number;
  day: number;
  weekday: Weekday;
  ymd: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  const year = Number(lookup("year"));
  const month = Number(lookup("month"));
  const day = Number(lookup("day"));
  const weekdayName = lookup("weekday");
  const weekday = weekdayName ? WEEKDAY_FROM_SHORT[weekdayName] : undefined;

  if (!year || !month || !day || !weekday) {
    throw new Error("Could not read Asia/Kolkata calendar date");
  }

  return {
    year,
    month,
    day,
    weekday,
    ymd: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/** Monday (YYYY-MM-DD) of the current Mon–Sun week in Asia/Kolkata (G16, S6, N13). */
export function getCurrentWeekStart(now: Date): string {
  const { ymd, weekday } = getIstCalendarParts(now);
  return addCalendarDays(ymd, 1 - weekday);
}

/** Calendar date in IST for weekday 1=Mon … 7=Sun within the given week. */
export function slotCalendarDate(weekStart: string, weekday: Weekday): string {
  return addCalendarDays(weekStart, weekday - 1);
}

export function weekdayLabel(weekday: Weekday): string {
  return WEEKDAY_LABELS[weekday];
}

export function formatWeekRange(weekStart: string): string {
  const weekEnd = addCalendarDays(weekStart, 6);
  const start = formatDayMonth(weekStart);
  const end = formatDayMonth(weekEnd);
  const year = weekEnd.slice(0, 4);
  return `${start} – ${end} ${year}`;
}

function formatDayMonth(ymd: string): string {
  const [, month, day] = ymd.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[month - 1]}`;
}

export function slotId(date: string, mealType: MealType): string {
  return `${date}-${mealType}`;
}

export function createEmptyWeek(weekStart: string): Week {
  const slots: Slot[] = [];
  const mealTypes: MealType[] = ["lunch", "dinner"];

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const day = weekday as Weekday;
    const date = slotCalendarDate(weekStart, day);
    for (const mealType of mealTypes) {
      slots.push({
        id: slotId(date, mealType),
        date,
        weekday: day,
        mealType,
        items: [],
        slotStatus: "UNDECIDED",
      });
    }
  }

  return {
    weekStart,
    status: "NOT_CREATED",
    slots,
  };
}

export function decidedCount(week: Week): number {
  return week.slots.filter((slot) => slot.slotStatus === "DECIDED").length;
}
