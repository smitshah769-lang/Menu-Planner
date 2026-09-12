import { MAX_QUANTITY } from "./constants";

export type QuantityParseResult = {
  quantity: number | null;
  /** False when input was invalid and previous value was kept (Q5, Q7). */
  accepted: boolean;
};

/** Parse a quantity field from user input (Q5–Q8). */
export function parseQuantityString(
  raw: string,
  previousValid: number | null,
): QuantityParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { quantity: null, accepted: true };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { quantity: previousValid, accepted: false };
  }

  if (parsed === 0) {
    return { quantity: previousValid, accepted: false };
  }

  if (parsed > MAX_QUANTITY) {
    return { quantity: MAX_QUANTITY, accepted: true };
  }

  return { quantity: parsed, accepted: true };
}

export function shouldIncludeQuantityInCopy(quantity: number | null): boolean {
  return quantity !== null;
}
