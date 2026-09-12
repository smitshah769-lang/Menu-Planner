import type { MealKind } from "@/types/meal";

export const MAX_QUANTITY = 20;

export const DEFAULT_ROTI_QTY = 13;
export const DEFAULT_SUBJI_QTY = 3;
export const DEFAULT_DAL_QTY = 3;
export const PAIRED_TINDORA_QTY = 1;

export const TURYA_MOONG_DAL_ID = "turya-moong-dal";
export const TINDORA_NU_SHAAK_ID = "tindora-nu-shaak";

export type ApplyQuantitiesTrigger = "generate" | "reconcile";

const FORCED_DEFAULT_KINDS: MealKind[] = ["roti", "subji", "dal"];

export function kindGetsForcedDefault(kind: MealKind): boolean {
  return FORCED_DEFAULT_KINDS.includes(kind);
}

/** Default qty for roti / subji / dal; null for overrides (Q4). */
export function defaultQuantityForKind(kind: MealKind): number | null {
  switch (kind) {
    case "roti":
      return DEFAULT_ROTI_QTY;
    case "subji":
      return DEFAULT_SUBJI_QTY;
    case "dal":
      return DEFAULT_DAL_QTY;
    default:
      return null;
  }
}
