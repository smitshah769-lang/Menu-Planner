import type { PersistOptions } from "@/lib/store/persist";
import { pushReminderBridge } from "./bridge";

/** Pass to store mutations from client components (Phase 7 snapshot sync). */
export const CLIENT_PERSIST_OPTIONS: PersistOptions = {
  reminderBridge: pushReminderBridge,
};
