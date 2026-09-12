export type MealKind = "roti" | "subji" | "dal" | "junk" | "other";

export type MealSection =
  | "gujarati-sabzis"
  | "dal-kadhi"
  | "rice-one-pot"
  | "rotli-breads"
  | "junk-variety";

export type Meal = {
  id: string;
  name: string;
  kind: MealKind;
  section: MealSection;
  tags: string[];
  lunchOnly: boolean;
  dinnerDefaultOk: boolean;
  lunchDefaultOk: boolean;
  dalDefaultOk?: boolean;
  active: boolean;
  vegetarian: true;
  excludePlainRice: boolean;
  isStaple: boolean;
  avoidAsDefault: boolean;
};
