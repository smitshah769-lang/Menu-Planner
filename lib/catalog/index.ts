import { MEALS, MEAL_BY_ID } from "@/data/meals";
import type { Meal, MealKind, MealSection } from "@/types/meal";

export { MEALS, MEAL_BY_ID } from "@/data/meals";

export function getMealById(id: string): Meal | undefined {
  return MEAL_BY_ID.get(id);
}

export function getActiveMeals(): Meal[] {
  return MEALS.filter((meal) => meal.active);
}

export function getMealsBySection(section: MealSection): Meal[] {
  return MEALS.filter((meal) => meal.section === section && meal.active);
}

export function getMealsByKind(kind: MealKind): Meal[] {
  return MEALS.filter((meal) => meal.kind === kind && meal.active);
}

/** Rajma / chole family — never default generate or first-wave (G11). */
export function isRajmaOrCholeDefaultBlocked(meal: Meal): boolean {
  if (meal.avoidAsDefault) {
    return true;
  }
  const normalized = meal.name.toLowerCase();
  return normalized.includes("rajma") || normalized.includes("chole");
}

/** Eligible for auto-generate / first-wave after hard filters (G17, G22, G23, G24). */
export function isGenerateCandidate(meal: Meal): boolean {
  if (!meal.active || !meal.vegetarian || meal.excludePlainRice) {
    return false;
  }
  if (meal.kind === "dal" && meal.dalDefaultOk === false) {
    return false;
  }
  if (isRajmaOrCholeDefaultBlocked(meal)) {
    return false;
  }
  return true;
}

/** Junk-night pool after G23 filters (G18). */
export function getEligibleJunkMeals(): Meal[] {
  return getMealsByKind("junk").filter(
    (meal) => meal.active && !meal.excludePlainRice,
  );
}

export function getDefaultDalMeals(): Meal[] {
  return getMealsByKind("dal").filter(
    (meal) => meal.active && meal.dalDefaultOk === true,
  );
}
