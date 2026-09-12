import type { UndecidedSnapshot } from "@/lib/store/snapshot";
import {
  saveSubscription,
  upsertSnapshotForEndpoint,
  type StoredPushKeys,
} from "@/lib/push/storage";

type SubscribeBody = {
  action: "subscribe";
  subscription: {
    endpoint: string;
    keys: StoredPushKeys;
  };
  snapshot?: UndecidedSnapshot;
};

type SnapshotBody = {
  action: "snapshot";
  endpoint: string;
  snapshot: UndecidedSnapshot;
};

type PushBody = SubscribeBody | SnapshotBody;

function isUndecidedSnapshot(value: unknown): value is UndecidedSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const snapshot = value as UndecidedSnapshot;
  return (
    typeof snapshot.weekStart === "string" &&
    Array.isArray(snapshot.undecidedSlotIds) &&
    snapshot.timezone === "Asia/Kolkata"
  );
}

export async function POST(request: Request) {
  let body: PushBody;
  try {
    body = (await request.json()) as PushBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "subscribe") {
    const { subscription, snapshot } = body;
    if (
      !subscription?.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return Response.json({ error: "Invalid subscription" }, { status: 400 });
    }
    if (snapshot && !isUndecidedSnapshot(snapshot)) {
      return Response.json({ error: "Invalid snapshot" }, { status: 400 });
    }

    await saveSubscription({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      snapshot: snapshot ?? null,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  }

  if (body.action === "snapshot") {
    const { endpoint, snapshot } = body;
    if (!endpoint || !isUndecidedSnapshot(snapshot)) {
      return Response.json({ error: "Invalid snapshot payload" }, { status: 400 });
    }
    await upsertSnapshotForEndpoint(endpoint, snapshot);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
