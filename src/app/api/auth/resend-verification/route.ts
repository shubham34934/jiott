import { NextResponse } from "next/server";
import { OtpType } from "@prisma/client";
import { createOtpRecord } from "@/lib/auth-otp";
import { sendOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const email =
    typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No account found for this email." },
      { status: 404 }
    );
  }
  if (user.emailVerified) {
    return NextResponse.json(
      { error: "This email is already verified. Sign in instead." },
      { status: 400 }
    );
  }

  const otp = await createOtpRecord(email, OtpType.VERIFY_EMAIL);
  const name = user.name ?? "there";
  const sent = await sendOtpEmail(email, name, otp, "verify");
  if (!sent.success) {
    return NextResponse.json(
      { error: sent.error ?? "Could not send email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
