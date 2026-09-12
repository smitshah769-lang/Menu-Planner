import { allSlotsDecided, undecidedSlotIds } from "@/lib/store/status";
import type { Week } from "@/types/week";
import { copyTextToClipboard, type ClipboardCopyResult } from "./clipboard";
import { renderMessage } from "./render";
import type { MessageCopyScope } from "./types";

export type CopyMessageResult =
  | {
      ok: true;
      text: string;
      clipboard: ClipboardCopyResult;
    }
  | {
      ok: false;
      reason: "undecided-full-week";
      undecidedSlotIds: string[];
    };

export async function copyMessage(
  week: Week,
  scope: MessageCopyScope,
  templateRaw: string | null = null,
): Promise<CopyMessageResult> {
  if (scope.type === "fullWeek" && !allSlotsDecided(week)) {
    return {
      ok: false,
      reason: "undecided-full-week",
      undecidedSlotIds: undecidedSlotIds(week),
    };
  }

  const text = renderMessage(week, scope, templateRaw);
  const clipboard = await copyTextToClipboard(text);
  return { ok: true, text, clipboard };
}
