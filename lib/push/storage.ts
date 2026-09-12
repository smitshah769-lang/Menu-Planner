import type { UndecidedSnapshot } from "@/lib/store/snapshot";
import { createHash } from "node:crypto";

export type StoredPushKeys = {
  p256dh: string;
  auth: string;
};

export type StoredSubscription = {
  endpoint: string;
  keys: StoredPushKeys;
  snapshot: UndecidedSnapshot | null;
  updatedAt: string;
};

const SUBSCRIPTION_INDEX_KEY = "menu-planner:push:subscription-index";
const subscriptionKeyPrefix = "menu-planner:push:sub:";

type KvLike = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
};

const memory = new Map<string, unknown>();

const memoryKv: KvLike = {
  async get<T>(key: string): Promise<T | null> {
    const value = memory.get(key);
    return (value as T | undefined) ?? null;
  },
  async set(key: string, value: unknown) {
    memory.set(key, value);
  },
  async del(key: string) {
    memory.delete(key);
  },
};

let kvPromise: Promise<KvLike> | null = null;

async function resolveKv(): Promise<KvLike> {
  if (!kvPromise) {
    kvPromise = (async () => {
      if (
        process.env.KV_REST_API_URL &&
        process.env.KV_REST_API_TOKEN
      ) {
        const { kv } = await import("@vercel/kv");
        return kv as KvLike;
      }
      return memoryKv;
    })();
  }
  return kvPromise;
}

export function endpointStorageKey(endpoint: string): string {
  const digest = createHash("sha256").update(endpoint).digest("base64url");
  return `${subscriptionKeyPrefix}${digest}`;
}

export async function saveSubscription(
  subscription: StoredSubscription,
): Promise<void> {
  const kv = await resolveKv();
  const key = endpointStorageKey(subscription.endpoint);
  await kv.set(key, subscription);

  const index =
    (await kv.get<string[]>(SUBSCRIPTION_INDEX_KEY)) ?? [];
  if (!index.includes(key)) {
    await kv.set(SUBSCRIPTION_INDEX_KEY, [...index, key]);
  }
}

export async function upsertSnapshotForEndpoint(
  endpoint: string,
  snapshot: UndecidedSnapshot,
): Promise<void> {
  const kv = await resolveKv();
  const key = endpointStorageKey(endpoint);
  const existing = await kv.get<StoredSubscription>(key);
  if (!existing) {
    return;
  }
  await kv.set(key, {
    ...existing,
    snapshot,
    updatedAt: new Date().toISOString(),
  });
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  const kv = await resolveKv();
  const index =
    (await kv.get<string[]>(SUBSCRIPTION_INDEX_KEY)) ?? [];
  const records: StoredSubscription[] = [];
  for (const key of index) {
    const record = await kv.get<StoredSubscription>(key);
    if (record) {
      records.push(record);
    }
  }
  return records;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const kv = await resolveKv();
  const key = endpointStorageKey(endpoint);
  await kv.del(key);
  const index =
    (await kv.get<string[]>(SUBSCRIPTION_INDEX_KEY)) ?? [];
  await kv.set(
    SUBSCRIPTION_INDEX_KEY,
    index.filter((entry) => entry !== key),
  );
}

const SENT_PREFIX = "menu-planner:push:sent:";

export async function wasReminderSent(reminderKey: string): Promise<boolean> {
  const kv = await resolveKv();
  const value = await kv.get<string>(`${SENT_PREFIX}${reminderKey}`);
  return value != null;
}

export async function markReminderSent(reminderKey: string): Promise<void> {
  const kv = await resolveKv();
  await kv.set(`${SENT_PREFIX}${reminderKey}`, new Date().toISOString());
}

/** Test-only reset. */
export function resetPushStorageForTests(): void {
  memory.clear();
  kvPromise = null;
}
