import {
  buildDigestNotification,
  buildReminderKey,
  dueReminders,
  type CronWindow,
} from "./reminders";
import { sendWebPush } from "./send";
import {
  listSubscriptions,
  markReminderSent,
  removeSubscription,
  wasReminderSent,
} from "./storage";

export type CronRunResult = {
  subscriptions: number;
  notificationsSent: number;
  skippedDuplicate: number;
};

export async function runReminderCron(
  now: Date,
  window: CronWindow,
): Promise<CronRunResult> {
  const subscriptions = await listSubscriptions();
  let notificationsSent = 0;
  let skippedDuplicate = 0;

  for (const record of subscriptions) {
    if (!record.snapshot) {
      continue;
    }

    const due = dueReminders(record.snapshot, now, window);
    if (due.length === 0) {
      continue;
    }

    const pending: typeof due = [];
    for (const item of due) {
      const key = buildReminderKey(item.slotId, item.slotDate, item.kind);
      if (await wasReminderSent(key)) {
        skippedDuplicate += 1;
        continue;
      }
      pending.push(item);
    }

    if (pending.length === 0) {
      continue;
    }

    const { title, body } = buildDigestNotification(pending, window);
    const result = await sendWebPush(record, { title, body, url: "/" });
    if (!result.ok) {
      if (result.gone) {
        await removeSubscription(record.endpoint);
      }
      continue;
    }

    for (const item of pending) {
      const key = buildReminderKey(item.slotId, item.slotDate, item.kind);
      await markReminderSent(key);
    }
    notificationsSent += 1;
  }

  return {
    subscriptions: subscriptions.length,
    notificationsSent,
    skippedDuplicate,
  };
}

/** Infer cron window from current IST hour (08:00 → morning, 18:00 → evening). */
export function inferCronWindow(now: Date): CronWindow {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  return hour < 12 ? "morning" : "evening";
}
