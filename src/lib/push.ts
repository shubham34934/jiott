import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export type NotificationType =
  | "challenge"
  | "challenge_accepted"
  | "challenge_declined"
  | "completion_proposed"
  | "completion_confirmed"
  | "completion_reopened"
  | "generic";

export interface PushPayload {
  /** One-line message shown in the notification. */
  body: string;
  /** Path opened when the user taps the notification. */
  url?: string;
  /** Used by the in-app list to pick an icon. */
  type?: NotificationType;
}

export interface SendPushResult {
  sent: number;
  removed: number;
  failed: number;
}

/** Send the same payload to many users. Dedupes, no-ops on missing VAPID. */
export async function sendPushToUsers(
  userIds: readonly string[],
  payload: PushPayload
): Promise<SendPushResult> {
  const unique = [...new Set(userIds.filter(Boolean))];
  await persistNotifications(unique, payload);
  const results = await Promise.all(
    unique.map((id) => pushWebOnly(id, payload))
  );
  return results.reduce<SendPushResult>(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      removed: acc.removed + r.removed,
      failed: acc.failed + r.failed,
    }),
    { sent: 0, removed: 0, failed: 0 }
  );
}

/** Persist one in-app `Notification` row per recipient. */
async function persistNotifications(
  userIds: readonly string[],
  payload: PushPayload
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type ?? null,
        body: payload.body,
        url: payload.url ?? null,
      })),
    });
  } catch (e) {
    console.error("[notifications] createMany failed", e);
  }
}

/** Send a notification to every registered device of a user + record it in-app. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<SendPushResult> {
  await persistNotifications([userId], payload);
  return pushWebOnly(userId, payload);
}

/** Raw Web Push fan-out (no Notification row). Used internally after persistence. */
async function pushWebOnly(
  userId: string,
  payload: PushPayload
): Promise<SendPushResult> {
  if (!ensureConfigured()) {
    console.warn("[push] VAPID env missing; skipping send");
    return { sent: 0, removed: 0, failed: 0 };
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let removed = 0;
  let failed = 0;
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body
        );
        sent++;
      } catch (e: unknown) {
        const status =
          typeof e === "object" && e !== null && "statusCode" in e
            ? Number((e as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } });
          removed++;
        } else {
          failed++;
          console.error("[push] send failed", status, e);
        }
      }
    })
  );
  return { sent, removed, failed };
}
