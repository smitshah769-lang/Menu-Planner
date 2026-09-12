import type { StoredSubscription } from "./storage";
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, pushConfigured } from "./vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendWebPush(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; statusCode?: number; gone?: boolean }> {
  if (!pushConfigured()) {
    return { ok: false };
  }

  const webpush = await import("web-push");
  webpush.setVapidDetails(
    getVapidSubject(),
    getVapidPublicKey()!,
    getVapidPrivateKey()!,
  );

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
      }),
    );
    return { ok: true };
  } catch (error: unknown) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : undefined;
    return {
      ok: false,
      statusCode,
      gone: statusCode === 404 || statusCode === 410,
    };
  }
}
