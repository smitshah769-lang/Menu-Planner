"use client";

import { buildUndecidedSnapshot } from "@/lib/store";
import { pushSupported, registerPushSubscription, subscribeToPush } from "@/lib/push";
import type { Week } from "@/types/week";
import { useEffect, useState } from "react";

type Props = {
  week: Week | null;
};

/**
 * N6: app works without push; banner when permission not granted.
 * N7: revoked permission → explain on next visit.
 */
export function PushBanner({ week }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  if (permission === "unsupported" || dismissed) {
    return null;
  }

  if (permission === "granted") {
    return null;
  }

  async function onAllow() {
    if (!("Notification" in window)) {
      return;
    }
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted" || !week) {
        return;
      }
      const subscription = await subscribeToPush();
      if (!subscription) {
        return;
      }
      await registerPushSubscription(
        subscription,
        buildUndecidedSnapshot(week),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="push-banner" aria-live="polite">
      <p className="push-banner-text">
        {permission === "denied"
          ? "Reminders are blocked in browser settings. Open site settings for this page to allow notifications, or keep planning without reminders."
          : "Turn on reminders to get a nudge for undecided meals (day before and same day, IST)."}
      </p>
      {permission === "default" ? (
        <div className="push-banner-actions">
          <button
            type="button"
            className="btn btn-small"
            disabled={busy}
            onClick={() => setDismissed(true)}
          >
            Not now
          </button>
          <button
            type="button"
            className="btn btn-small btn-primary"
            disabled={busy || !week}
            onClick={onAllow}
          >
            {busy ? "Enabling…" : "Allow reminders"}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-small" onClick={() => setDismissed(true)}>
          Dismiss
        </button>
      )}
    </aside>
  );
}
