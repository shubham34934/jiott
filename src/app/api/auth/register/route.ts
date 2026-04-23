import { NextResponse } from "next/server";
import { OtpType, Prisma } from "@prisma/client";
import { createOtpRecord } from "@/lib/auth-otp";
import { sendOtpEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

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
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email) || email.length > 255) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashed = await hashPassword(password);
  try {
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        emailVerified: null,
        player: { create: {} },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    throw e;
  }

  const otp = await createOtpRecord(email, OtpType.VERIFY_EMAIL);
  const sent = await sendOtpEmail(email, name, otp, "verify");
  if (!sent.success) {
    return NextResponse.json(
      { error: sent.error ?? "Could not send verification email." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
