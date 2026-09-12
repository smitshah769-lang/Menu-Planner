import { approveWeek, type PersistOptions } from "@/lib/store";
import type { Week } from "@/types/week";
import { copyMessage, type CopyMessageResult } from "./copy";

export type ApproveAndCopyResult =
  | {
      ok: true;
      week: Week;
      text: string;
      clipboardOk: boolean;
    }
  | {
      ok: false;
      reason: "undecided";
      undecidedSlotIds: string[];
    };

/** Approve when all 14 decided, then copy full week (A1, A2). */
export async function approveAndCopyFullWeek(
  week: Week,
  templateRaw: string | null,
  options: PersistOptions = {},
): Promise<ApproveAndCopyResult> {
  const approved = approveWeek(week, options);
  if (!approved.ok) {
    return {
      ok: false,
      reason: "undecided",
      undecidedSlotIds: approved.undecidedSlotIds,
    };
  }

  const copied = await copyMessage(approved.week, { type: "fullWeek" }, templateRaw);
  if (!copied.ok) {
    throw new Error("copyMessage failed after approve");
  }

  return {
    ok: true,
    week: approved.week,
    text: copied.text,
    clipboardOk: copied.clipboard.ok,
  };
}
