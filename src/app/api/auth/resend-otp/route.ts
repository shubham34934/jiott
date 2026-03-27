import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { OtpType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { email, type } = await req.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: "Email and type are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type as OtpType;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return NextResponse.json({
        message: "If this email is registered, a new code has been sent.",
      });
    }

    // Rate limit: check last OTP was sent more than 60 seconds ago
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        email: normalizedEmail,
        type: otpType,
        used: false,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentOtp) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting a new code." },
        { status: 429 }
      );
    }

    const code = await createOtp(normalizedEmail, otpType);
    await sendOtpEmail(
      normalizedEmail,
      user.name || "User",
      code,
      otpType === "VERIFY_EMAIL" ? "verify" : "reset"
    );

    return NextResponse.json({ message: "New code sent to your email." });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
