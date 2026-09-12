import { MEALS } from "@/data/meals";
import type { Meal } from "@/types/meal";
import type { MealType, Slot, Week } from "@/types/week";
import {
  isBlockedAsDefault,
  isDefaultDal,
  isDefaultSubjiForMealType,
  isKhichdiOrPulao,
  passesHardFilters,
} from "./filters";
import { mealIdsUsedInWeek, weekendDinnerHasJunk } from "./usage";

export const SUGGESTION_PAGE_SIZE = 4;

export type SuggestionWave = "first" | "more";

export type Suggestion = {
  meal: Meal;
  alreadyUsedThisWeek: boolean;
};

export type SuggestInput = {
  slot: Slot;
  week: Week;
  wave: SuggestionWave;
  /** 0-based page into the ranked list. First wave is always page 0. More defaults to 1. */
  page?: number;
};

function isWeekendDinner(slot: Slot): boolean {
  return slot.mealType === "dinner" && (slot.weekday === 5 || slot.weekday === 6);
}

/** First wave for Fri/Sat dinner is junk only when the other weekend dinner is not already junk (C3, C4). */
export function preferJunkFirstWave(slot: Slot, week: Week): boolean {
  if (!isWeekendDinner(slot)) {
    return false;
  }
  const otherWeekday = slot.weekday === 5 ? 6 : 5;
  return !weekendDinnerHasJunk(week, otherWeekday);
}

function catalogOrder(a: Meal, b: Meal): number {
  return MEALS.findIndex((m) => m.id === a.id) - MEALS.findIndex((m) => m.id === b.id);
}

function rankByStapleThenCatalog(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => {
    if (a.isStaple !== b.isStaple) {
      return a.isStaple ? -1 : 1;
    }
    return catalogOrder(a, b);
  });
}

function firstWaveMeals(slot: Slot, week: Week): Meal[] {
  const mealType: MealType = slot.mealType;
  const eligible = MEALS.filter((meal) => passesHardFilters(meal, mealType));

  if (preferJunkFirstWave(slot, week)) {
    const junk = eligible.filter(
      (meal) => meal.kind === "junk" && !isBlockedAsDefault(meal),
    );
    const preferred = junk.filter(
      (meal) => meal.id === "pav-bhaji" || meal.id === "ragda-pattice",
    );
    const rest = junk.filter(
      (meal) => meal.id !== "pav-bhaji" && meal.id !== "ragda-pattice",
    );
    return [...preferred, ...rest];
  }

  const subjis = rankByStapleThenCatalog(
    eligible.filter((meal) => isDefaultSubjiForMealType(meal, mealType)),
  );

  const dals = eligible
    .filter((meal) => isDefaultDal(meal) && !isBlockedAsDefault(meal))
    .sort((a, b) => {
      const rank = (meal: Meal) =>
        meal.id === "tuvar-dal" ? 0 : meal.id === "gujarati-dal" ? 1 : 2;
      const delta = rank(a) - rank(b);
      return delta !== 0 ? delta : catalogOrder(a, b);
    });

  const breads =
    slot.weekday === 3 && slot.mealType === "lunch"
      ? eligible.filter((meal) => meal.kind === "roti")
      : [];

  return [...subjis, ...dals, ...breads];
}

function moreWaveExtras(slot: Slot, week: Week, alreadyListed: Set<string>): Meal[] {
  const mealType: MealType = slot.mealType;
  const eligible = MEALS.filter(
    (meal) => passesHardFilters(meal, mealType) && !alreadyListed.has(meal.id),
  );

  const lessPreferredSubji = eligible.filter(
    (meal) =>
      meal.kind === "subji" &&
      !isDefaultSubjiForMealType(meal, mealType),
  );

  const lessPreferredDal = eligible.filter(
    (meal) => meal.kind === "dal" && !isDefaultDal(meal),
  );

  const breads = eligible.filter((meal) => meal.kind === "roti");
  const onePot = eligible.filter(
    (meal) => meal.kind === "other" && isKhichdiOrPulao(meal),
  );
  const otherOther = eligible.filter(
    (meal) => meal.kind === "other" && !isKhichdiOrPulao(meal),
  );
  const junk = eligible.filter((meal) => meal.kind === "junk");

  return [
    ...lessPreferredSubji,
    ...lessPreferredDal,
    ...breads,
    ...onePot,
    ...otherOther,
    ...junk,
  ];
}

/** Full ranked catalog for this slot: first-wave order, then remaining eligible items (C8–C10). */
export function rankSuggestions(slot: Slot, week: Week): Meal[] {
  const first = firstWaveMeals(slot, week);
  const seen = new Set(first.map((meal) => meal.id));
  const restOfFirstPool: Meal[] = [];
  const extras = moreWaveExtras(slot, week, seen);

  const extraIds = new Set(extras.map((meal) => meal.id));
  for (const meal of MEALS) {
    if (seen.has(meal.id) || extraIds.has(meal.id)) {
      continue;
    }
    if (passesHardFilters(meal, slot.mealType)) {
      restOfFirstPool.push(meal);
    }
  }

  return [...first, ...restOfFirstPool, ...extras];
}

export function suggest(input: SuggestInput): Suggestion[] {
  const { slot, week, wave } = input;
  const ranked = rankSuggestions(slot, week);
  const page = wave === "first" ? 0 : (input.page ?? 1);
  const start = page * SUGGESTION_PAGE_SIZE;
  const pageMeals = ranked.slice(start, start + SUGGESTION_PAGE_SIZE);

  if (pageMeals.length === 0) {
    return [];
  }

  const used = mealIdsUsedInWeek(week, slot.id);
  return pageMeals.map((meal) => ({
    meal,
    alreadyUsedThisWeek: used.has(meal.id),
  }));
}
