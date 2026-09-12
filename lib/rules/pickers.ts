import { MEALS } from "@/data/meals";
import { getMealById } from "@/lib/catalog";
import type { Meal } from "@/types/meal";
import type { MealType } from "@/types/week";
import { MenuGenerateError } from "./errors";
import {
  isBlockedAsDefault,
  isDefaultDal,
  isDefaultSubjiForMealType,
  passesHardFilters,
} from "./filters";

const DEFAULT_ROTI_ID = "roti-phulka";
const TUVAR_DAL_ID = "tuvar-dal";
const GUJARATI_DAL_ID = "gujarati-dal";
const PREFERRED_JUNK_IDS = ["pav-bhaji", "ragda-pattice"] as const;

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Exactly one of Friday (5) or Saturday (6) dinner is junk for this week (G8, G9). */
export function junkDinnerWeekday(weekStart: string): 5 | 6 {
  return hashString(weekStart) % 2 === 0 ? 5 : 6;
}

function catalogIndex(meal: Meal): number {
  return MEALS.findIndex((candidate) => candidate.id === meal.id);
}

export function pickDefaultRoti(): Meal {
  const roti = getMealById(DEFAULT_ROTI_ID);
  if (!roti || !passesHardFilters(roti, "lunch")) {
    throw new MenuGenerateError(
      "NO_ELIGIBLE_ROTI",
      "No eligible default roti (Roti / Phulka) in the catalog.",
    );
  }
  return roti;
}

export function eligibleGenerateSubjis(mealType: MealType): Meal[] {
  return MEALS.filter(
    (meal) =>
      passesHardFilters(meal, mealType) &&
      isDefaultSubjiForMealType(meal, mealType),
  );
}

export function pickGenerateSubji(
  mealType: MealType,
  usage: Map<string, number>,
): Meal {
  const eligible = eligibleGenerateSubjis(mealType);
  if (eligible.length === 0) {
    throw new MenuGenerateError(
      "NO_ELIGIBLE_SUBJI",
      `No eligible catalog subji for ${mealType}.`,
    );
  }

  const staples = eligible.filter((meal) => meal.isStaple);
  const pool = staples.length > 0 ? staples : eligible;

  pool.sort((a, b) => {
    const usedA = usage.get(a.id) ?? 0;
    const usedB = usage.get(b.id) ?? 0;
    if (usedA !== usedB) {
      return usedA - usedB;
    }
    return catalogIndex(a) - catalogIndex(b);
  });

  const picked = pool[0];
  usage.set(picked.id, (usage.get(picked.id) ?? 0) + 1);
  return picked;
}

export function pickGenerateDal(): Meal {
  const tuvar = getMealById(TUVAR_DAL_ID);
  if (tuvar && passesHardFilters(tuvar, "lunch") && isDefaultDal(tuvar)) {
    return tuvar;
  }

  const gujarati = getMealById(GUJARATI_DAL_ID);
  if (
    gujarati &&
    passesHardFilters(gujarati, "lunch") &&
    isDefaultDal(gujarati)
  ) {
    return gujarati;
  }

  const fallback = MEALS.find(
    (meal) =>
      meal.kind === "dal" &&
      passesHardFilters(meal, "lunch") &&
      isDefaultDal(meal) &&
      !isBlockedAsDefault(meal),
  );

  if (!fallback) {
    throw new MenuGenerateError(
      "NO_ELIGIBLE_DAL",
      "No eligible default dal in the catalog (Tuvar Dal / Gujarati Dal).",
    );
  }
  return fallback;
}

/** Junk after G23; never rajma/chole as generate default (G11, G18). */
export function eligibleGenerateJunk(): Meal[] {
  return MEALS.filter(
    (meal) =>
      meal.kind === "junk" &&
      passesHardFilters(meal, "dinner") &&
      !isBlockedAsDefault(meal),
  );
}

export function pickGenerateJunk(weekStart: string): Meal {
  const eligible = eligibleGenerateJunk();
  if (eligible.length === 0) {
    throw new MenuGenerateError(
      "NO_ELIGIBLE_JUNK",
      "No eligible junk/variety dish in the catalog. Cannot fill Friday or Saturday dinner.",
    );
  }

  const preferred = PREFERRED_JUNK_IDS.map((id) => getMealById(id)).filter(
    (meal): meal is Meal =>
      Boolean(meal && eligible.some((candidate) => candidate.id === meal.id)),
  );

  const pool = preferred.length > 0 ? preferred : eligible;
  return pool[hashString(`${weekStart}:junk`) % pool.length];
}
