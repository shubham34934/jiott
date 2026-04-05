/**
 * Branded OTP HTML for SMTP (`sendOtpEmail`). Registration verification via `authClient.emailOtp`
 * is emailed by Neon Auth; to use this template for those OTPs, register a Neon Auth webhook for
 * `send.otp` and send mail with `buildBrandedOtpEmailHtml` (see Neon “Auth webhooks” guide).
 */
import nodemailer from "nodemailer";

/** Matches `JioTTAuthMark`: secondary → primary gradient + mono paddle/ball (`JioTTLogo`). */
const EMAIL_APP_ICON_GRADIENT =
  "linear-gradient(135deg, #a78bfa 0%, #5e9eff 100%)";

/** Inline mono mark (viewBox matches `public/logo.svg`), white on gradient — no external assets. */
const EMAIL_APP_ICON_SVG = `
<svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
  <rect x="10" y="9" width="13" height="30" rx="6.5" fill="#ffffff" fill-opacity="0.95"/>
  <circle cx="33" cy="24" r="9.5" fill="#ffffff" fill-opacity="0.85"/>
</svg>`;

/**
 * Optional absolute URL for `/logo.svg` (many clients render raster/img better than inline SVG).
 * Neon Auth sends verification OTP from Neon's servers; this only affects `sendOtpEmail()`.
 */
function resolveEmailLogoImgSrc(): string | null {
  const explicit = process.env.EMAIL_LOGO_URL?.trim();
  if (explicit) return explicit;
  const baseRaw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : "");
  if (!baseRaw) return null;
  const base = baseRaw.replace(/\/$/, "");
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin}/logo.svg`;
}

function emailAppIconBlock(): string {
  const imgSrc = resolveEmailLogoImgSrc();
  const img = imgSrc
    ? `<img src="${imgSrc}" width="40" height="40" alt="JioTT" style="display:block;width:40px;height:40px;margin:0 auto;border-radius:10px;" />`
    : EMAIL_APP_ICON_SVG;
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;border-collapse:collapse;">
                <tr>
                  <td align="center" valign="middle" style="width:64px;height:64px;padding:12px;border-radius:16px;background:${EMAIL_APP_ICON_GRADIENT};box-shadow:0 10px 28px rgba(0,0,0,0.18);">
                    ${img}
                  </td>
                </tr>
              </table>`;
}

function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || "465");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function buildBrandedOtpEmailHtml(
  name: string,
  otp: string,
  type: "verify" | "reset"
) {
  const title =
    type === "verify" ? "Verify your email" : "Reset your password";
  const message =
    type === "verify"
      ? "Use the code below to verify your JioTT account."
      : "Use the code below to reset your JioTT password.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;">
          <!-- Header (app icon matches in-app JioTTAuthMark) -->
          <tr>
            <td style="background:linear-gradient(160deg,#1a1d28 0%,#252836 45%,#2d3250 100%);padding:32px;text-align:center;">
              ${emailAppIconBlock()}
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">JioTT</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.78);font-size:13px;">Table Tennis Tracker</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#111827;font-size:16px;font-weight:600;">Hi ${name},</p>
              <p style="margin:0 0 28px;color:#6B7280;font-size:14px;line-height:1.6;">${message}</p>

              <!-- OTP Box -->
              <div style="background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your verification code</p>
                <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1D4ED8;font-family:monospace;">${otp}</div>
              </div>

              <p style="margin:0 0 4px;color:#6B7280;font-size:13px;">⏱ This code expires in <strong>10 minutes</strong>.</p>
              <p style="margin:0;color:#6B7280;font-size:13px;">🔒 If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:11px;">© 2026 JioTT. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOtpEmail(
  email: string,
  name: string,
  otp: string,
  type: "verify" | "reset"
): Promise<{ success: boolean; error?: string }> {
  const isProduction = process.env.NODE_ENV === "production";

  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your-email@gmail.com") {
    if (isProduction) {
      console.error("[EMAIL] SMTP_USER not configured in production!");
      return { success: false, error: "Email service not configured." };
    }
    console.log(`\n📧 [EMAIL OTP - DEV MODE]`);
    console.log(`   To: ${email}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Type: ${type}\n`);
    return { success: true };
  }

  try {
    const transporter = createTransporter();
    const subject =
      type === "verify"
        ? "JioTT - Verify your email address"
        : "JioTT - Reset your password";

    const info = await transporter.sendMail({
      from: `"JioTT" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: buildBrandedOtpEmailHtml(name, otp, type),
    });

    console.log(`[EMAIL] Sent ${type} OTP to ${email} (messageId: ${info.messageId})`);
    return { success: true };
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error(`[EMAIL] SMTP failed: ${errMsg}`);

    if (!isProduction) {
      console.log(`\n📧 [EMAIL OTP - DEV FALLBACK]`);
      console.log(`   To: ${email}`);
      console.log(`   OTP: ${otp}`);
      console.log(`   Type: ${type}\n`);
      return { success: true };
    }

    return { success: false, error: "Failed to send email. Please try again." };
  }
}
