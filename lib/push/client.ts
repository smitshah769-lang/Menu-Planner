"use client";

import type { UndecidedSnapshot } from "@/lib/store/snapshot";

const SUBSCRIPTION_STORAGE_KEY = "menu-planner:push-endpoint";

export type ClientPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getStoredPushEndpoint(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storePushEndpoint(endpoint: string): void {
  try {
    window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, endpoint);
  } catch {
    // ignore quota errors
  }
}

export function clearStoredPushEndpoint(): void {
  try {
    window.localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function subscribeToPush(): Promise<ClientPushSubscription | null> {
  if (!pushSupported()) {
    return null;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set; push subscribe skipped");
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  const clientSub: ClientPushSubscription = {
    endpoint,
    keys: { p256dh, auth },
  };
  storePushEndpoint(endpoint);
  return clientSub;
}

export async function postPushApi(body: unknown): Promise<boolean> {
  try {
    const response = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function registerPushSubscription(
  subscription: ClientPushSubscription,
  snapshot?: UndecidedSnapshot,
): Promise<boolean> {
  return postPushApi({
    action: "subscribe",
    subscription,
    snapshot,
  });
}

export async function syncPushSnapshot(
  snapshot: UndecidedSnapshot,
): Promise<boolean> {
  const endpoint = getStoredPushEndpoint();
  if (!endpoint) {
    return false;
  }
  return postPushApi({
    action: "snapshot",
    endpoint,
    snapshot,
  });
}

export async function unsubscribePushLocally(): Promise<void> {
  if (!pushSupported()) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
  clearStoredPushEndpoint();
}
