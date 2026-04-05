import { NextResponse } from "next/server";
import { OtpType } from "@prisma/client";
import { consumeOtp } from "@/lib/auth-otp";
import { hashPassword } from "@/lib/password";
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
  const raw = body as Record<string, unknown>;
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const otp = typeof raw.otp === "string" ? raw.otp.replace(/\D/g, "") : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email || otp.length !== 6 || !password) {
    return NextResponse.json(
      { error: "Email, 6-digit code, and new password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const ok = await consumeOtp(email, otp, OtpType.RESET_PASSWORD);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid or expired code." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const hashed = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
