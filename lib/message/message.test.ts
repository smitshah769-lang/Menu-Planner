import { describe, expect, it } from "vitest";
import { createEmptyWeek } from "@/lib/time/week";
import { generateMenu } from "@/lib/store";
import { applyQuantities } from "@/lib/quantity";
import {
  approveAndCopyFullWeek,
  copyMessage,
  renderMessage,
  resolveMessageTemplate,
  serializeMessageTemplate,
  DEFAULT_MESSAGE_TEMPLATE,
} from "@/lib/message";
import type { Slot, SlotItem, Week } from "@/types/week";

const WEEK_START = "2026-08-31";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function generatedWeek(): Week {
  const result = generateMenu(createEmptyWeek(WEEK_START), {
    storage: new MemoryStorage(),
  });
  if (!result.ok) {
    throw new Error("generate failed");
  }
  return result.week;
}

function slotOf(week: Week, weekday: number, mealType: "lunch" | "dinner"): Slot {
  const slot = week.slots.find(
    (candidate) => candidate.weekday === weekday && candidate.mealType === mealType,
  );
  if (!slot) {
    throw new Error("slot missing");
  }
  return slot;
}

describe("resolveMessageTemplate", () => {
  it("falls back to default when stored template is broken (A7)", () => {
    const resolved = resolveMessageTemplate("{not json");
    expect(resolved.header).toBe(DEFAULT_MESSAGE_TEMPLATE.header);
    expect(resolved.mealLine).toBe(DEFAULT_MESSAGE_TEMPLATE.mealLine);
  });
});

describe("renderMessage", () => {
  it("renders plain text with header and meals (A3)", () => {
    const week = generatedWeek();
    const text = renderMessage(week, { type: "fullWeek" });
    expect(text).toContain("Hi, this week's tiffin menu (4 people):");
    expect(text).toContain("Monday");
    expect(text).toContain("Lunch:");
    expect(text).toContain("Dinner:");
    expect(text).not.toMatch(/\|.*\|/);
  });

  it("uses edited title in copy, not catalog id (T1)", () => {
    const week = generatedWeek();
    const mondayLunch = slotOf(week, 1, "lunch");
    mondayLunch.items[0].title = "Phulka nu roti";
    const text = renderMessage(
      { ...week, slots: week.slots.map((s) => (s.id === mondayLunch.id ? mondayLunch : s)) },
      { type: "slots", slotIds: [mondayLunch.id] },
    );
    expect(text).toContain("Phulka nu roti");
    expect(text).not.toContain("roti-phulka");
  });

  it("omits empty wording and null qty (A9, T3, A11, Q16)", () => {
    const week = generatedWeek();
    const slot = slotOf(week, 2, "dinner");
    const junk = slot.items.find((item) => item.kind === "junk");
    if (junk) {
      junk.quantity = null;
      junk.wording = "";
    }
    const subji = slot.items.find((item) => item.kind === "subji" && !item.paired);
    if (subji) {
      subji.wording = "   ";
      subji.quantity = null;
    }
    const text = renderMessage(
      { ...week, slots: week.slots.map((s) => (s.id === slot.id ? slot : s)) },
      { type: "slots", slotIds: [slot.id] },
    );
    expect(text).not.toContain("(Qty: null)");
    if (junk) {
      expect(text).toContain(junk.title);
      expect(text).not.toMatch(new RegExp(`${junk.title} \\(Qty:`));
    }
  });

  it("formats Wednesday lunch as roti only when not overridden (A10)", () => {
    const week = generatedWeek();
    const wed = slotOf(week, 3, "lunch");
    const text = renderMessage(week, { type: "slots", slotIds: [wed.id] });
    expect(text).toContain("Lunch: Roti only (Qty: 13)");
  });

  it("uses full plate wording when Wednesday lunch is overridden (A10, C1)", () => {
    const week = generatedWeek();
    const wed = slotOf(week, 3, "lunch");
    const items: SlotItem[] = [
      ...wed.items,
      {
        mealId: "kobi-nu-shaak",
        kind: "subji",
        title: "Kobi subji",
        wording: "",
        quantity: 3,
      },
    ];
    const overridden = applyQuantities({ ...wed, items }, "generate");
    const text = renderMessage(
      {
        ...week,
        slots: week.slots.map((s) => (s.id === wed.id ? overridden : s)),
      },
      { type: "slots", slotIds: [wed.id] },
    );
    expect(text).not.toContain("Roti only");
    expect(text).toContain("Kobi subji (Qty: 3)");
  });

  it("includes tindora qty 1 with turya moong dal (A13)", () => {
    const week = generatedWeek();
    const slot = slotOf(week, 4, "lunch");
    const items: SlotItem[] = [
      {
        mealId: "roti-phulka",
        kind: "roti",
        title: "Roti / Phulka",
        wording: "",
        quantity: 13,
      },
      {
        mealId: "kobi-nu-shaak",
        kind: "subji",
        title: "Kobi",
        wording: "",
        quantity: 3,
      },
      {
        mealId: "turya-moong-dal",
        kind: "dal",
        title: "Turya Moong Dal",
        wording: "",
        quantity: 3,
      },
    ];
    const withPairing = applyQuantities({ ...slot, items }, "generate");
    const text = renderMessage(
      {
        ...week,
        slots: week.slots.map((s) => (s.id === slot.id ? withPairing : s)),
      },
      { type: "slots", slotIds: [slot.id] },
    );
    expect(text).toContain("Turya Moong Dal (Qty: 3)");
    expect(text).toContain("Tindora nu Shaak (Qty: 1)");
    expect(text).toContain("Roti / Phulka (Qty: 13)");
  });

  it("includes instructions when present and skips when empty (A9)", () => {
    const week = generatedWeek();
    const slot = slotOf(week, 5, "dinner");
    slot.instructions = "extra pav";
    const emptyNote = slotOf(week, 5, "lunch");
    emptyNote.instructions = "   ";
    const text = renderMessage(
      {
        ...week,
        slots: week.slots.map((s) => {
          if (s.id === slot.id) {
            return slot;
          }
          if (s.id === emptyNote.id) {
            return emptyNote;
          }
          return s;
        }),
      },
      { type: "slots", slotIds: [slot.id, emptyNote.id] },
    );
    expect(text).toContain("Note: extra pav");
    expect(text).not.toContain("Note:    ");
  });

  it("copies only requested slots for midweek scope (A14, A15)", () => {
    const week = generatedWeek();
    const tuesdayDinner = slotOf(week, 2, "dinner");
    const text = renderMessage(week, {
      type: "slots",
      slotIds: [tuesdayDinner.id],
    });
    expect(text).toContain("Tuesday");
    expect(text).toContain("Dinner:");
    expect(text).not.toContain("Monday");
    expect(text).not.toContain("Wednesday");
  });

  it("respects a customized template config", () => {
    const week = generatedWeek();
    const slot = slotOf(week, 1, "lunch");
    const custom = serializeMessageTemplate({
      version: 1,
      header: "Menu:",
      mealLine: "{mealType} -> {items}",
      noteLine: "",
      itemSeparator: " | ",
      itemFormat: "{title}{qtyPart}",
    });
    const text = renderMessage(week, { type: "slots", slotIds: [slot.id] }, custom);
    expect(text.startsWith("Menu:")).toBe(true);
    expect(text).toContain("Lunch ->");
    expect(text).toContain(" | ");
  });
});

describe("copyMessage", () => {
  it("blocks full-week copy when any slot is undecided (A2)", async () => {
    const empty = createEmptyWeek(WEEK_START);
    const result = await copyMessage(empty, { type: "fullWeek" });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("undecided-full-week");
    expect(result.undecidedSlotIds).toHaveLength(14);
  });

  it("allows slot-only copy without full week approval (A14)", async () => {
    const week = generatedWeek();
    const slot = slotOf(week, 2, "dinner");
    const result = await copyMessage(week, {
      type: "slots",
      slotIds: [slot.id],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.text).toContain("Tuesday");
    expect(result.clipboard.text).toBe(result.text);
  });
});

describe("approveAndCopyFullWeek", () => {
  it("approves and returns full-week text when all slots are decided (A1)", async () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const result = await approveAndCopyFullWeek(generated.week, null, { storage });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.week.status).toBe("APPROVED");
    expect(result.text).toContain("Monday");
    expect(result.text.length).toBeGreaterThan(50);
  });

  it("does not approve when slots are undecided (A2)", async () => {
    const storage = new MemoryStorage();
    const empty = createEmptyWeek(WEEK_START);
    const result = await approveAndCopyFullWeek(empty, null, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.undecidedSlotIds).toHaveLength(14);
    expect(empty.status).toBe("NOT_CREATED");
  });
});
