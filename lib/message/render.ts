import type { Slot, Week } from "@/types/week";
import { renderSlotLines } from "./formatSlot";
import { resolveMessageTemplate } from "./resolveTemplate";
import { slotsForScope } from "./scope";
import type { MessageCopyScope } from "./types";

function renderSlotsToText(
  slots: Slot[],
  templateRaw: string | null,
): string {
  const config = resolveMessageTemplate(templateRaw);
  const lines: string[] = [];

  if (config.header.trim().length > 0) {
    lines.push(config.header.trim());
  }

  let lastWeekday: number | null = null;
  const bodyLines: string[] = [];

  for (const slot of slots) {
    const includeDay = slot.weekday !== lastWeekday;
    const block = renderSlotLines(slot, config, includeDay);
    if (block.dayLine) {
      bodyLines.push(block.dayLine);
      lastWeekday = slot.weekday;
    }
    bodyLines.push(block.mealLine);
    if (block.noteLine) {
      bodyLines.push(block.noteLine);
    }
  }

  if (bodyLines.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...bodyLines);
  }

  return lines.join("\n").trimEnd();
}

/** Plain-text message only (A3). */
export function renderMessage(
  week: Week,
  scope: MessageCopyScope,
  templateRaw: string | null = null,
): string {
  const slots = slotsForScope(week, scope);
  return renderSlotsToText(slots, templateRaw);
}

export function previewMessage(
  week: Week,
  templateRaw: string | null,
): string {
  return renderMessage(week, { type: "fullWeek" }, templateRaw);
}
