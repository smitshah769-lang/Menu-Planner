import type { ReminderBridge } from "@/lib/store/snapshot";
import { syncPushSnapshot } from "./client";

export const pushReminderBridge: ReminderBridge = {
  upsertSnapshot(snapshot) {
    void syncPushSnapshot(snapshot);
  },
};
