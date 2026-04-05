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
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const emailField = raw && typeof raw.email === "string" ? raw.email : "";
  const email = emailField.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.password && user.emailVerified) {
    const otp = await createOtpRecord(email, OtpType.RESET_PASSWORD);
    const name = user.name ?? "there";
    const sent = await sendOtpEmail(email, name, otp, "reset");
    if (!sent.success) {
      return NextResponse.json(
        { error: sent.error ?? "Could not send email." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
