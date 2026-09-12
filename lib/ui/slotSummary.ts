import { displayTitle } from "@/lib/message/formatItem";
import type { Slot } from "@/types/week";

export function summarizeSlot(slot: Slot): string {
  if (slot.slotStatus === "UNDECIDED" || slot.items.length === 0) {
    return "Not planned";
  }
  return slot.items.map((item) => displayTitle(item)).join(" · ");
}
