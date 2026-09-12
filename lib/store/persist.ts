import { createEmptyWeek, getCurrentWeekStart } from "@/lib/time/week";
import type { Week } from "@/types/week";
import { TEMPLATE_STORAGE_KEY, weekStorageKey } from "./keys";
import { parseWeekJson } from "./parse";
import {
  buildUndecidedSnapshot,
  noopReminderBridge,
  type ReminderBridge,
} from "./snapshot";

export function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type PersistOptions = {
  storage?: Storage | null;
  reminderBridge?: ReminderBridge;
};

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) {
    return storage;
  }
  return getBrowserStorage();
}

export function loadWeek(
  weekStart: string,
  storage?: Storage | null,
): Week {
  const store = resolveStorage(storage);
  if (!store) {
    return createEmptyWeek(weekStart);
  }
  const raw = store.getItem(weekStorageKey(weekStart));
  if (!raw) {
    return createEmptyWeek(weekStart);
  }
  return parseWeekJson(raw, weekStart);
}

/** Boot helper: only the current IST Monday (S5, S6). Never loads last week. */
export function loadCurrentWeek(now: Date, storage?: Storage | null): Week {
  return loadWeek(getCurrentWeekStart(now), storage);
}

export function saveWeek(week: Week, options: PersistOptions = {}): Week {
  const store = resolveStorage(options.storage);
  if (store) {
    store.setItem(weekStorageKey(week.weekStart), JSON.stringify(week));
  }
  const bridge = options.reminderBridge ?? noopReminderBridge;
  void bridge.upsertSnapshot(buildUndecidedSnapshot(week));
  return week;
}

export function loadTemplate(storage?: Storage | null): string | null {
  const store = resolveStorage(storage);
  if (!store) {
    return null;
  }
  return store.getItem(TEMPLATE_STORAGE_KEY);
}

export function saveTemplate(template: string, storage?: Storage | null): void {
  const store = resolveStorage(storage);
  if (!store) {
    return;
  }
  store.setItem(TEMPLATE_STORAGE_KEY, template);
}

/**
 * Apply a storage event from another tab (S3). Same-tab writes do not fire `storage`.
 * Last write already won in localStorage; this reloads that value.
 */
export function weekFromStorageEvent(
  event: { key: string | null; newValue: string | null },
  weekStart: string,
): Week | null {
  if (event.key !== weekStorageKey(weekStart)) {
    return null;
  }
  if (event.newValue == null) {
    return createEmptyWeek(weekStart);
  }
  return parseWeekJson(event.newValue, weekStart);
}

export function subscribeWeekStorage(
  weekStart: string,
  onChange: (week: Week) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = (event: StorageEvent) => {
    const next = weekFromStorageEvent(event, weekStart);
    if (next) {
      onChange(next);
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
