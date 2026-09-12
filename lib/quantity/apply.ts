import { getMealById } from "@/lib/catalog";
import type { Slot, SlotItem } from "@/types/week";
import {
  ApplyQuantitiesTrigger,
  DEFAULT_DAL_QTY,
  DEFAULT_ROTI_QTY,
  PAIRED_TINDORA_QTY,
  TINDORA_NU_SHAAK_ID,
  TURYA_MOONG_DAL_ID,
  defaultQuantityForKind,
  kindGetsForcedDefault,
} from "./constants";

function cloneSlot(slot: Slot): Slot {
  return {
    ...slot,
    items: slot.items.map((item) => ({ ...item })),
  };
}

function createPairedTindoraItem(): SlotItem {
  const catalog = getMealById(TINDORA_NU_SHAAK_ID);
  return {
    mealId: TINDORA_NU_SHAAK_ID,
    kind: "subji",
    title: catalog?.name ?? "Tindora nu Shaak",
    wording: "",
    quantity: PAIRED_TINDORA_QTY,
    paired: true,
  };
}

function slotHasTuryaMoong(slot: Slot): boolean {
  return slot.items.some((item) => item.mealId === TURYA_MOONG_DAL_ID);
}

function applyGenerateDefaults(items: SlotItem[]): void {
  for (const item of items) {
    if (item.paired) {
      continue;
    }
    if (kindGetsForcedDefault(item.kind)) {
      item.quantity = defaultQuantityForKind(item.kind);
    } else {
      item.quantity = null;
    }
  }
}

function syncTuryaMoongPairing(slot: Slot): void {
  const hasTurya = slotHasTuryaMoong(slot);

  if (!hasTurya) {
    slot.items = slot.items.filter(
      (item) => !(item.paired && item.mealId === TINDORA_NU_SHAAK_ID),
    );
    return;
  }

  const paired = slot.items.find(
    (item) => item.paired && item.mealId === TINDORA_NU_SHAAK_ID,
  );

  if (paired) {
    paired.quantity = PAIRED_TINDORA_QTY;
    return;
  }

  slot.items.push(createPairedTindoraItem());
}

function applySecondSubjiRule(items: SlotItem[]): void {
  const manualSubjis = items.filter(
    (item) => item.kind === "subji" && !item.paired,
  );

  if (manualSubjis.length < 2) {
    return;
  }

  for (const item of manualSubjis) {
    item.quantity = 2;
  }
}

function enforcePairedSubjiQuantities(items: SlotItem[]): void {
  for (const item of items) {
    if (item.paired && item.kind === "subji") {
      item.quantity = PAIRED_TINDORA_QTY;
    }
  }
}

/**
 * Apply quantity rules to a slot (generate + pairing + Q12).
 * Does not refill quantities the user cleared unless `trigger` is `generate`.
 */
export function applyQuantities(
  slot: Slot,
  trigger: ApplyQuantitiesTrigger,
): Slot {
  const next = cloneSlot(slot);

  if (trigger === "generate") {
    applyGenerateDefaults(next.items);
  }

  syncTuryaMoongPairing(next);

  if (trigger === "generate") {
    for (const item of next.items) {
      if (item.mealId === TURYA_MOONG_DAL_ID) {
        item.quantity = DEFAULT_DAL_QTY;
      }
      if (item.kind === "roti" && item.quantity === null) {
        item.quantity = DEFAULT_ROTI_QTY;
      }
    }
    enforcePairedSubjiQuantities(next.items);
  }

  applySecondSubjiRule(next.items);
  enforcePairedSubjiQuantities(next.items);

  return next;
}

/** Q14: when dish kind changes, use the new type default (or null for overrides). */
export function quantityAfterKindChange(kind: SlotItem["kind"]): number | null {
  return defaultQuantityForKind(kind);
}
