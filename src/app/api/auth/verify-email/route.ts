import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await verifyOtp(normalizedEmail, code.trim(), "VERIFY_EMAIL");
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified." });
    }

    // Verify email and create player profile atomically
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    });

    // Create player profile if not exists
    const existingPlayer = await prisma.player.findUnique({
      where: { userId: user.id },
    });

    if (!existingPlayer) {
      await prisma.player.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({ message: "Email verified successfully." });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
