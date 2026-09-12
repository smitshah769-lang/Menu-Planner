import {
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_MESSAGE_TEMPLATE_STORAGE,
} from "./defaultTemplate";
import type { MessageTemplateConfig } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseConfig(value: unknown): MessageTemplateConfig | null {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }
  if (
    typeof value.header !== "string" ||
    typeof value.mealLine !== "string" ||
    typeof value.noteLine !== "string" ||
    typeof value.itemSeparator !== "string" ||
    typeof value.itemFormat !== "string"
  ) {
    return null;
  }
  return {
    version: 1,
    header: value.header,
    mealLine: value.mealLine,
    noteLine: value.noteLine,
    itemSeparator: value.itemSeparator,
    itemFormat: value.itemFormat,
  };
}

/** Broken or missing template → default (A7). */
export function resolveMessageTemplate(stored: string | null): MessageTemplateConfig {
  if (!stored || stored.trim().length === 0) {
    return { ...DEFAULT_MESSAGE_TEMPLATE };
  }
  try {
    const parsed = parseConfig(JSON.parse(stored));
    if (parsed) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_MESSAGE_TEMPLATE };
}

export function loadResolvedMessageTemplate(
  stored: string | null,
): MessageTemplateConfig {
  if (stored === DEFAULT_MESSAGE_TEMPLATE_STORAGE) {
    return { ...DEFAULT_MESSAGE_TEMPLATE };
  }
  return resolveMessageTemplate(stored);
}
