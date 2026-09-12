import type { MealKind } from "./meal";

export type SlotStatus = "UNDECIDED" | "DECIDED";
export type WeekStatus = "NOT_CREATED" | "GENERATED" | "UNDER_REVIEW" | "APPROVED";
export type MealType = "lunch" | "dinner";
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SlotItem = {
  mealId: string;
  kind: MealKind;
  title: string;
  wording: string;
  quantity: number | null;
  paired?: boolean;
};

export type Slot = {
  id: string;
  date: string;
  weekday: Weekday;
  mealType: MealType;
  items: SlotItem[];
  instructions?: string;
  slotStatus: SlotStatus;
};

export type Week = {
  weekStart: string;
  status: WeekStatus;
  slots: Slot[];
};
