import { describe, expect, it } from "vitest";
import type { Slot, SlotItem } from "@/types/week";
import {
  DEFAULT_DAL_QTY,
  DEFAULT_ROTI_QTY,
  DEFAULT_SUBJI_QTY,
  PAIRED_TINDORA_QTY,
  applyQuantities,
  defaultQuantityForKind,
  parseQuantityString,
  quantityAfterKindChange,
  shouldIncludeQuantityInCopy,
} from "@/lib/quantity";

function baseSlot(items: SlotItem[]): Slot {
  return {
    id: "2026-09-01-lunch",
    date: "2026-09-01",
    weekday: 1,
    mealType: "lunch",
    items,
    slotStatus: "DECIDED",
  };
}

function plateItems(): SlotItem[] {
  return [
    {
      mealId: "roti-phulka",
      kind: "roti",
      title: "Roti / Phulka",
      wording: "",
      quantity: null,
    },
    {
      mealId: "kobi-nu-shaak",
      kind: "subji",
      title: "Kobi nu Shaak (Kobi subji)",
      wording: "",
      quantity: null,
    },
    {
      mealId: "tuvar-dal",
      kind: "dal",
      title: "Tuvar Dal",
      wording: "",
      quantity: null,
    },
  ];
}

describe("quantity validation", () => {
  it("clears to null (Q8)", () => {
    expect(parseQuantityString("", 13)).toEqual({
      quantity: null,
      accepted: true,
    });
  });

  it("rejects zero and keeps previous (Q5)", () => {
    expect(parseQuantityString("0", 13)).toEqual({
      quantity: 13,
      accepted: false,
    });
  });

  it("clamps above 20 (Q6)", () => {
    expect(parseQuantityString("21", 3)).toEqual({
      quantity: 20,
      accepted: true,
    });
  });

  it("rejects non-integers (Q7)", () => {
    expect(parseQuantityString("2.5", 3)).toEqual({
      quantity: 3,
      accepted: false,
    });
    expect(parseQuantityString("abc", 3)).toEqual({
      quantity: 3,
      accepted: false,
    });
  });

  it("omits null quantities from copy (Q16)", () => {
    expect(shouldIncludeQuantityInCopy(null)).toBe(false);
    expect(shouldIncludeQuantityInCopy(13)).toBe(true);
  });
});

describe("applyQuantities", () => {
  it("applies roti 13, subji 3, dal 3 on generate (Q1)", () => {
    const result = applyQuantities(baseSlot(plateItems()), "generate");
    expect(result.items.find((i) => i.kind === "roti")?.quantity).toBe(
      DEFAULT_ROTI_QTY,
    );
    expect(result.items.find((i) => i.kind === "subji" && !i.paired)?.quantity).toBe(
      DEFAULT_SUBJI_QTY,
    );
    expect(result.items.find((i) => i.kind === "dal")?.quantity).toBe(
      DEFAULT_DAL_QTY,
    );
  });

  it("applies subji + roti only defaults (Q2)", () => {
    const items = plateItems().filter((item) => item.kind !== "dal");
    const result = applyQuantities(baseSlot(items), "generate");
    expect(result.items).toHaveLength(2);
    expect(result.items.find((i) => i.kind === "roti")?.quantity).toBe(13);
    expect(result.items.find((i) => i.kind === "subji")?.quantity).toBe(3);
  });

  it("applies roti only for Wednesday lunch pattern (Q3)", () => {
    const items = [plateItems()[0]];
    const result = applyQuantities(baseSlot(items), "generate");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(13);
  });

  it("does not force defaults on override dishes (Q4)", () => {
    const items: SlotItem[] = [
      {
        mealId: "pav-bhaji",
        kind: "junk",
        title: "Pav Bhaji",
        wording: "",
        quantity: null,
      },
    ];
    const result = applyQuantities(baseSlot(items), "generate");
    expect(result.items[0].quantity).toBeNull();
  });

  it("does not refill cleared quantities on reconcile (Q8)", () => {
    const items = plateItems().map((item) => ({
      ...item,
      quantity: item.kind === "subji" ? null : 13,
    }));
    const result = applyQuantities(baseSlot(items), "reconcile");
    expect(result.items.find((i) => i.kind === "subji")?.quantity).toBeNull();
    expect(result.items.find((i) => i.kind === "roti")?.quantity).toBe(13);
  });

  it("sets both manual subjis to 2 when two are present (Q12)", () => {
    const items: SlotItem[] = [
      ...plateItems(),
      {
        mealId: "tindora-nu-shaak",
        kind: "subji",
        title: "Tindora nu Shaak",
        wording: "",
        quantity: 3,
      },
    ];
    const result = applyQuantities(baseSlot(items), "generate");
    const manualSubjis = result.items.filter(
      (item) => item.kind === "subji" && !item.paired,
    );
    expect(manualSubjis).toHaveLength(2);
    for (const item of manualSubjis) {
      expect(item.quantity).toBe(2);
    }
  });

  it("adds paired tindora qty 1 with turya moong dal (Q15, G21)", () => {
    const items = plateItems().map((item) =>
      item.kind === "dal"
        ? {
            ...item,
            mealId: "turya-moong-dal",
            title: "Turya Moong Dal",
          }
        : item,
    );
    const result = applyQuantities(baseSlot(items), "generate");
    const paired = result.items.find((item) => item.paired);
    expect(paired?.mealId).toBe("tindora-nu-shaak");
    expect(paired?.quantity).toBe(PAIRED_TINDORA_QTY);
    expect(
      result.items.filter((item) => item.kind === "subji" && !item.paired),
    ).toHaveLength(1);
    expect(result.items.find((i) => i.mealId === "turya-moong-dal")?.quantity).toBe(
      DEFAULT_DAL_QTY,
    );
  });

  it("keeps paired tindora at 1 when two manual subjis would trigger Q12", () => {
    const items: SlotItem[] = [
      {
        mealId: "roti-phulka",
        kind: "roti",
        title: "Roti",
        wording: "",
        quantity: 13,
      },
      {
        mealId: "turya-moong-dal",
        kind: "dal",
        title: "Turya Moong Dal",
        wording: "",
        quantity: 3,
      },
      {
        mealId: "kobi-nu-shaak",
        kind: "subji",
        title: "Kobi",
        wording: "",
        quantity: 3,
      },
      {
        mealId: "vatana-bateta-nu-shaak",
        kind: "subji",
        title: "Vatana",
        wording: "",
        quantity: 3,
      },
    ];
    const result = applyQuantities(baseSlot(items), "reconcile");
    const paired = result.items.find((item) => item.paired);
    expect(paired?.quantity).toBe(1);
    const manual = result.items.filter(
      (item) => item.kind === "subji" && !item.paired,
    );
    expect(manual).toHaveLength(2);
    for (const item of manual) {
      expect(item.quantity).toBe(2);
    }
  });

  it("removes paired tindora when turya moong dal is removed", () => {
    const items: SlotItem[] = [
      {
        mealId: "tuvar-dal",
        kind: "dal",
        title: "Tuvar Dal",
        wording: "",
        quantity: 3,
      },
      {
        mealId: "tindora-nu-shaak",
        kind: "subji",
        title: "Tindora nu Shaak",
        wording: "",
        quantity: 1,
        paired: true,
      },
    ];
    const result = applyQuantities(baseSlot(items), "reconcile");
    expect(
      result.items.some((item) => item.paired && item.mealId === "tindora-nu-shaak"),
    ).toBe(false);
  });
});

describe("quantityAfterKindChange", () => {
  it("switches dal default to subji default (Q14)", () => {
    expect(quantityAfterKindChange("dal")).toBe(defaultQuantityForKind("dal"));
    expect(quantityAfterKindChange("subji")).toBe(defaultQuantityForKind("subji"));
    expect(quantityAfterKindChange("junk")).toBeNull();
  });
});
