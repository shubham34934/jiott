import { NextResponse } from "next/server";
import { verifyNeonAuthWebhook } from "@/lib/neon-auth-webhook-verify";
import { sendOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type SendOtpEventData = {
  otp_code?: string;
  otp_type?: string;
};

type WebhookUser = {
  email?: string;
  name?: string | null;
};

/**
 * Neon Auth: subscribe to `send.otp` and point the webhook URL here so OTP emails use
 * `buildBrandedOtpEmailHtml` (JioTT icon + layout in `src/lib/email.ts`).
 *
 * PUT …/auth/webhooks with `"enabled_events": ["send.otp"]` (and optionally others you handle below).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const payload = await verifyNeonAuthWebhook(rawBody, request.headers);
    const eventType = payload.event_type as string;

    switch (eventType) {
      case "send.otp": {
        const eventData = payload.event_data as SendOtpEventData;
        const user = payload.user as WebhookUser;
        const email = user?.email?.toLowerCase().trim();
        const code = eventData?.otp_code;
        if (!email || !code) {
          return NextResponse.json(
            { error: "Missing user.email or event_data.otp_code" },
            { status: 400 }
          );
        }
        const otpType =
          eventData.otp_type === "forget-password" ? "reset" : "verify";
        const name = user.name?.trim() || "there";
        const result = await sendOtpEmail(email, name, code, otpType);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error ?? "Failed to send email" },
            { status: 500 }
          );
        }
        break;
      }
      case "send.magic_link":
        console.error(
          "[neon-auth webhook] send.magic_link received but not implemented — use a separate webhook URL or Neon default delivery for magic links"
        );
        return NextResponse.json(
          { error: "send.magic_link not implemented on this endpoint" },
          { status: 501 }
        );
      case "user.before_create":
        return NextResponse.json({ allowed: true });
      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook error";
    const isClient =
      /signature|Missing|Invalid|timestamp|JWK|JWKS/i.test(msg) ||
      msg.includes("too old");
    console.error("[neon-auth webhook]", msg);
    return NextResponse.json(
      { error: msg },
      { status: isClient ? 400 : 500 }
    );
  }
}
