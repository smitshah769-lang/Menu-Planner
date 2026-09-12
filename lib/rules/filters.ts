import { MEAL_BY_ID } from "@/data/meals";
import type { Meal } from "@/types/meal";
import type { MealType } from "@/types/week";

/** Ordered hard filters shared by generate and suggest (edge §8, G22). */
export function isCatalogMeal(meal: Meal): boolean {
  return MEAL_BY_ID.has(meal.id);
}

export function looksLikePlainRice(meal: Meal): boolean {
  if (meal.excludePlainRice) {
    return true;
  }
  const name = meal.name.toLowerCase();
  if (name.includes("khichdi") || name.includes("pulao")) {
    return false;
  }
  return (
    name.includes("fried rice") ||
    name.includes("bhaat") ||
    /(^|[\s&])rice($|[\s&])/.test(name)
  );
}

/**
 * Vegetarian, no plain rice, active, catalog-only, lunch-only never at dinner.
 * Ranking rules (rajma/chole, fansi lunch default, turya moong) are not applied here.
 */
export function passesHardFilters(meal: Meal, mealType: MealType): boolean {
  if (!isCatalogMeal(meal)) {
    return false;
  }
  if (!meal.vegetarian) {
    return false;
  }
  if (!meal.active) {
    return false;
  }
  if (looksLikePlainRice(meal)) {
    return false;
  }
  if (mealType === "dinner" && meal.lunchOnly) {
    return false;
  }
  return true;
}

/** Generate / first-wave: never auto-pick rajma or chole (G11, C8). */
export function isBlockedAsDefault(meal: Meal): boolean {
  if (meal.avoidAsDefault) {
    return true;
  }
  const normalized = meal.name.toLowerCase();
  return normalized.includes("rajma") || normalized.includes("chole");
}

/** Generate / first-wave dal: never turya moong (G24). */
export function isDefaultDal(meal: Meal): boolean {
  return meal.kind === "dal" && meal.dalDefaultOk === true;
}

/** Generate / first-wave subji for this meal type (G13, G20). */
export function isDefaultSubjiForMealType(meal: Meal, mealType: MealType): boolean {
  if (meal.kind !== "subji") {
    return false;
  }
  if (isBlockedAsDefault(meal)) {
    return false;
  }
  if (mealType === "lunch" && !meal.lunchDefaultOk) {
    return false;
  }
  if (mealType === "dinner" && !meal.dinnerDefaultOk) {
    return false;
  }
  return true;
}

export function isKhichdiOrPulao(meal: Meal): boolean {
  if (meal.kind !== "other") {
    return false;
  }
  const name = meal.name.toLowerCase();
  return name.includes("khichdi") || name.includes("pulao");
}
