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

export interface PushPayload {
  /** One-line message shown in the notification. */
  body: string;
  /** Path opened when the user taps the notification. */
  url?: string;
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
  const results = await Promise.all(
    unique.map((id) => sendPushToUser(id, payload))
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

/** Send a notification to every registered device of a user. Removes dead subscriptions. */
export async function sendPushToUser(
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
