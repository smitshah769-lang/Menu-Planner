import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEALS } from "./meals";
import {
  getDefaultDalMeals,
  getEligibleJunkMeals,
  isGenerateCandidate,
  isRajmaOrCholeDefaultBlocked,
} from "@/lib/catalog";

const CATALOG_PATH = join(process.cwd(), "Meal catalog.md");

function parseCatalogDishNames(markdown: string): string[] {
  const names: string[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\d+\.\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    let name = match[1].trim();
    const dashIndex = name.indexOf(" —");
    if (dashIndex !== -1) {
      name = name.slice(0, dashIndex).trim();
    }
    if (name.length > 0) {
      names.push(name);
    }
  }
  return names;
}

describe("Meal catalog (data/meals.ts)", () => {
  const catalogNames = parseCatalogDishNames(readFileSync(CATALOG_PATH, "utf8"));

  it("includes every catalog dish name from Meal catalog.md", () => {
    const mealNames = new Set(MEALS.map((meal) => meal.name));
    for (const name of catalogNames) {
      expect(mealNames.has(name)).toBe(true);
    }
    expect(MEALS.length).toBe(catalogNames.length);
  });

  it("uses unique stable ids (no duplicate catalog numbering)", () => {
    const ids = MEALS.map((meal) => meal.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks plain-rice / fried-rice exclusions (G23)", () => {
    const excluded = MEALS.filter((meal) => meal.excludePlainRice);
    const excludedNames = excluded.map((meal) => meal.name).sort();
    expect(excludedNames).toEqual(
      [
        "Dal-Bhaat-Shaak",
        "Gujarati Vagharelo Bhaat",
        "Manchurian with Fried Rice",
        "Mexican Rice & Beans",
        "Veg Schezwan Fried Rice",
      ].sort(),
    );
    for (const meal of excluded) {
      expect(isGenerateCandidate(meal)).toBe(false);
    }
  });

  it("never treats turya moong as a default dal (G24)", () => {
    const turya = MEALS.find((meal) => meal.id === "turya-moong-dal");
    expect(turya?.dalDefaultOk).toBe(false);
    expect(isGenerateCandidate(turya!)).toBe(false);
    const defaults = getDefaultDalMeals().map((meal) => meal.name);
    expect(defaults).toContain("Tuvar Dal");
    expect(defaults).toContain("Gujarati Dal");
    expect(defaults).not.toContain("Turya Moong Dal");
  });

  it("blocks rajma/chole as defaults (G11)", () => {
    const chole = MEALS.filter((meal) =>
      meal.name.toLowerCase().includes("chole"),
    );
    expect(chole.length).toBeGreaterThan(0);
    for (const meal of chole) {
      expect(isRajmaOrCholeDefaultBlocked(meal)).toBe(true);
      expect(isGenerateCandidate(meal)).toBe(false);
    }
  });

  it("keeps an eligible junk pool for generate (G18)", () => {
    const junk = getEligibleJunkMeals();
    expect(junk.length).toBeGreaterThan(0);
    expect(junk.some((meal) => meal.name === "Pav Bhaji")).toBe(true);
    expect(junk.some((meal) => meal.name === "Ragda Pattice")).toBe(true);
  });

  it("only exports active vegetarian meals for generate candidates", () => {
    for (const meal of MEALS) {
      expect(meal.active).toBe(true);
      expect(meal.vegetarian).toBe(true);
      if (isGenerateCandidate(meal)) {
        expect(meal.excludePlainRice).toBe(false);
      }
    }
  });

  it("encodes lunch-only staples (G7)", () => {
    const lunchOnly = MEALS.filter((meal) => meal.lunchOnly);
    const lunchOnlyNames = lunchOnly.map((meal) => meal.name).sort();
    expect(lunchOnlyNames).toEqual(
      [
        "Bharwa Bhinda",
        "Bhinda nu Shaak",
        "Choli nu Shaak (Choli subji)",
      ].sort(),
    );
  });

  it("encodes fansi as not a default lunch subji (G20)", () => {
    const fansi = MEALS.find((meal) => meal.id === "fansi-nu-shaak");
    expect(fansi?.lunchDefaultOk).toBe(false);
    expect(fansi?.dinnerDefaultOk).toBe(true);
  });
});
