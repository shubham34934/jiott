import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.emailVerified) {
      return NextResponse.json({
        message: "If an account exists, a reset code has been sent.",
      });
    }

    // Rate limit: 60 seconds
    const recent = await prisma.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: "RESET_PASSWORD",
        used: false,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recent) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another reset code." },
        { status: 429 }
      );
    }

    const code = await createOtp(normalizedEmail, "RESET_PASSWORD");
    await sendOtpEmail(normalizedEmail, user.name || "User", code, "reset");

    return NextResponse.json({
      message: "If an account exists, a reset code has been sent.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
