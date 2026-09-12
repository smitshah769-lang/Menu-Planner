import { describe, expect, it } from "vitest";
import { MEAL_BY_ID } from "@/data/meals";
import type { Week } from "@/types/week";
import { createEmptyWeek, getCurrentWeekStart } from "@/lib/time/week";
import {
  TEMPLATE_STORAGE_KEY,
  applySlotSuggestion,
  approveWeek,
  buildUndecidedSnapshot,
  clearWeekSlot,
  generateMenu,
  loadCurrentWeek,
  loadTemplate,
  loadWeek,
  removeSlotItem,
  saveTemplate,
  saveWeek,
  updateSlotInstructions,
  updateSlotItem,
  weekFromStorageEvent,
  weekStorageKey,
  type ReminderBridge,
  type UndecidedSnapshot,
} from "@/lib/store";
import type { Meal } from "@/types/meal";

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

const WEEK_START = "2026-08-31";

function meal(id: string): Meal {
  const found = MEAL_BY_ID.get(id);
  if (!found) {
    throw new Error(`Missing meal ${id}`);
  }
  return found;
}

function recordingBridge(): { bridge: ReminderBridge; snapshots: UndecidedSnapshot[] } {
  const snapshots: UndecidedSnapshot[] = [];
  return {
    snapshots,
    bridge: {
      upsertSnapshot: (snapshot) => {
        snapshots.push(snapshot);
      },
    },
  };
}

function persistOpts(storage: Storage, bridge?: ReminderBridge) {
  return { storage, reminderBridge: bridge };
}

describe("week persistence", () => {
  it("returns NOT_CREATED empty 14 slots when missing (S6)", () => {
    const storage = new MemoryStorage();
    const week = loadWeek(WEEK_START, storage);
    expect(week.status).toBe("NOT_CREATED");
    expect(week.slots).toHaveLength(14);
    expect(week.slots.every((slot) => slot.slotStatus === "UNDECIDED")).toBe(true);
    expect(storage.getItem(weekStorageKey(WEEK_START))).toBeNull();
  });

  it("round-trips a saved week so refresh keeps it (S1)", () => {
    const storage = new MemoryStorage();
    const { bridge } = recordingBridge();
    const generated = generateMenu(createEmptyWeek(WEEK_START), persistOpts(storage, bridge));
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const loaded = loadWeek(WEEK_START, storage);
    expect(loaded.status).toBe("GENERATED");
    expect(loaded.slots).toHaveLength(14);
    expect(loaded.slots.every((slot) => slot.slotStatus === "DECIDED")).toBe(true);
    expect(loaded.slots[0].items[0].title).toBe(generated.week.slots[0].items[0].title);
  });

  it("does not load last week on a new Monday (S5, S6)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);

    const nextMonday = new Date("2026-09-06T18:40:00.000Z");
    expect(getCurrentWeekStart(nextMonday)).toBe("2026-09-07");
    const current = loadCurrentWeek(nextMonday, storage);
    expect(current.weekStart).toBe("2026-09-07");
    expect(current.status).toBe("NOT_CREATED");
    expect(storage.getItem(weekStorageKey(WEEK_START))).not.toBeNull();
  });

  it("last write wins for the same week key (S3)", () => {
    const storage = new MemoryStorage();
    const first = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const edited = clearWeekSlot(first.week, first.week.slots[0].id, { storage });
    const loaded = loadWeek(WEEK_START, storage);
    expect(loaded.status).toBe("UNDER_REVIEW");
    expect(loaded.slots[0].slotStatus).toBe("UNDECIDED");
    expect(edited.slots[0].slotStatus).toBe("UNDECIDED");
  });

  it("treats corrupt JSON as a missing week", () => {
    const storage = new MemoryStorage();
    storage.setItem(weekStorageKey(WEEK_START), "{not json");
    const week = loadWeek(WEEK_START, storage);
    expect(week.status).toBe("NOT_CREATED");
  });

  it("ignores a stored payload whose weekStart does not match the key", () => {
    const storage = new MemoryStorage();
    const payload: Week = {
      ...createEmptyWeek("2026-09-07"),
      status: "GENERATED",
    };
    storage.setItem(weekStorageKey(WEEK_START), JSON.stringify(payload));
    const week = loadWeek(WEEK_START, storage);
    expect(week.status).toBe("NOT_CREATED");
    expect(week.weekStart).toBe(WEEK_START);
  });

  it("reloads from another tab's storage event (S3)", () => {
    const generated = generateMenu(createEmptyWeek(WEEK_START), {
      storage: new MemoryStorage(),
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const next = weekFromStorageEvent(
      {
        key: weekStorageKey(WEEK_START),
        newValue: JSON.stringify(generated.week),
      },
      WEEK_START,
    );
    expect(next?.status).toBe("GENERATED");
    expect(
      weekFromStorageEvent(
        { key: TEMPLATE_STORAGE_KEY, newValue: "x" },
        WEEK_START,
      ),
    ).toBeNull();
    expect(
      weekFromStorageEvent(
        { key: weekStorageKey(WEEK_START), newValue: null },
        WEEK_START,
      )?.status,
    ).toBe("NOT_CREATED");
  });

  it("persists the message template separately", () => {
    const storage = new MemoryStorage();
    expect(loadTemplate(storage)).toBeNull();
    saveTemplate("Hi, {day}", storage);
    expect(loadTemplate(storage)).toBe("Hi, {day}");
    expect(storage.getItem(TEMPLATE_STORAGE_KEY)).toBe("Hi, {day}");
  });
});

describe("status machine", () => {
  it("requires confirm before overwriting an existing week (G2, S4)", () => {
    const storage = new MemoryStorage();
    const first = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const blocked = generateMenu(first.week, { storage, confirm: false });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) {
      return;
    }
    expect(blocked.reason).toBe("needs-confirm");
    expect(loadWeek(WEEK_START, storage).status).toBe("GENERATED");
  });

  it("Generate after APPROVED with confirm yields GENERATED, not APPROVED (S4)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const approved = approveWeek(generated.week, { storage });
    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }
    expect(approved.week.status).toBe("APPROVED");
    const again = generateMenu(approved.week, { storage, confirm: true });
    expect(again.ok).toBe(true);
    if (!again.ok) {
      return;
    }
    expect(again.week.status).toBe("GENERATED");
    expect(loadWeek(WEEK_START, storage).status).toBe("GENERATED");
  });

  it("edits move GENERATED and APPROVED to UNDER_REVIEW (A5)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const slotId = generated.week.slots[0].id;
    const afterGenerateEdit = updateSlotItem(
      generated.week,
      slotId,
      0,
      { title: "Phulka" },
      { storage },
    );
    expect(afterGenerateEdit.status).toBe("UNDER_REVIEW");
    expect(afterGenerateEdit.slots[0].items[0].mealId).toBe(
      generated.week.slots[0].items[0].mealId,
    );

    const regenerated = generateMenu(createEmptyWeek(WEEK_START), {
      storage,
      confirm: true,
    });
    expect(regenerated.ok).toBe(true);
    if (!regenerated.ok) {
      return;
    }
    const approved = approveWeek(regenerated.week, { storage });
    expect(approved.ok).toBe(true);
    if (!approved.ok) {
      return;
    }
    const afterApproveEdit = updateSlotInstructions(
      approved.week,
      approved.week.slots[1].id,
      "less oil",
      { storage },
    );
    expect(afterApproveEdit.status).toBe("UNDER_REVIEW");
  });

  it("does not approve while slots are UNDECIDED (A2)", () => {
    const storage = new MemoryStorage();
    const empty = createEmptyWeek(WEEK_START);
    const result = approveWeek(empty, { storage });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.undecidedSlotIds).toHaveLength(14);
    expect(empty.status).toBe("NOT_CREATED");
  });
});

describe("slot mutations", () => {
  it("selecting a suggestion marks the slot DECIDED (C12)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const slot = generated.week.slots.find(
      (candidate) => candidate.weekday === 3 && candidate.mealType === "lunch",
    );
    if (!slot) {
      throw new Error("missing wednesday lunch");
    }
    const next = applySlotSuggestion(generated.week, slot.id, meal("kobi-nu-shaak"), {
      storage,
    });
    const updated = next.slots.find((candidate) => candidate.id === slot.id);
    expect(updated?.slotStatus).toBe("DECIDED");
    expect(updated?.items.some((item) => item.mealId === "kobi-nu-shaak")).toBe(
      true,
    );
    expect(next.status).toBe("UNDER_REVIEW");
  });

  it("clearing a slot marks UNDECIDED (C13)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const dinner = generated.week.slots.find(
      (slot) => slot.weekday === 2 && slot.mealType === "dinner",
    );
    if (!dinner) {
      throw new Error("missing tuesday dinner");
    }
    const next = clearWeekSlot(generated.week, dinner.id, { storage });
    const updated = next.slots.find((slot) => slot.id === dinner.id);
    expect(updated?.items).toEqual([]);
    expect(updated?.slotStatus).toBe("UNDECIDED");
    expect(buildUndecidedSnapshot(next).undecidedSlotIds).toContain(dinner.id);
  });

  it("falls back to the catalog name when title is cleared (T2)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const slot = generated.week.slots[0];
    const mealId = slot.items[0].mealId;
    const next = updateSlotItem(
      generated.week,
      slot.id,
      0,
      { title: "   " },
      { storage },
    );
    expect(next.slots[0].items[0].title).toBe(meal(mealId).name);
    expect(next.slots[0].items[0].mealId).toBe(mealId);
  });

  it("keeps remaining item title/qty when one dish is dropped (C15)", () => {
    const storage = new MemoryStorage();
    const generated = generateMenu(createEmptyWeek(WEEK_START), { storage });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    const slot = generated.week.slots.find(
      (candidate) =>
        candidate.items.some((item) => item.kind === "dal") &&
        candidate.items.length === 3,
    );
    if (!slot) {
      throw new Error("missing plate slot");
    }
    const dalIndex = slot.items.findIndex((item) => item.kind === "dal");
    const roti = slot.items.find((item) => item.kind === "roti");
    const next = removeSlotItem(generated.week, slot.id, dalIndex, { storage });
    const updated = next.slots.find((candidate) => candidate.id === slot.id);
    expect(updated?.items.some((item) => item.kind === "dal")).toBe(false);
    expect(updated?.items.find((item) => item.kind === "roti")?.quantity).toBe(
      roti?.quantity,
    );
    expect(updated?.items.find((item) => item.kind === "roti")?.title).toBe(
      roti?.title,
    );
    expect(updated?.slotStatus).toBe("DECIDED");
  });

  it("calls the reminder bridge with undecided ids after persist", () => {
    const storage = new MemoryStorage();
    const { bridge, snapshots } = recordingBridge();
    const generated = generateMenu(createEmptyWeek(WEEK_START), persistOpts(storage, bridge));
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      return;
    }
    expect(snapshots.at(-1)?.undecidedSlotIds).toEqual([]);
    const slotId = generated.week.slots[3].id;
    clearWeekSlot(generated.week, slotId, persistOpts(storage, bridge));
    expect(snapshots.at(-1)?.undecidedSlotIds).toEqual([slotId]);
    expect(snapshots.at(-1)?.timezone).toBe("Asia/Kolkata");
  });
});
