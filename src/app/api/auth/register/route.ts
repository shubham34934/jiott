import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      // Rate-limit: don't resend if an OTP was created in the last 60 seconds
      const recentOtp = await prisma.otpCode.findFirst({
        where: {
          email: normalizedEmail,
          type: "VERIFY_EMAIL",
          used: false,
          createdAt: { gte: new Date(Date.now() - 60 * 1000) },
        },
      });

      if (recentOtp) {
        return NextResponse.json({
          message: "OTP already sent. Please check your email.",
        });
      }

      // Update password in case user changed it during re-registration
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { name: name.trim(), password: hashedPassword },
      });

      const code = await createOtp(normalizedEmail, "VERIFY_EMAIL");
      const emailResult = await sendOtpEmail(normalizedEmail, existing.name || name, code, "verify");
      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error },
          { status: 500 }
        );
      }
      return NextResponse.json({ message: "OTP resent. Please verify your email." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    const code = await createOtp(normalizedEmail, "VERIFY_EMAIL");
    const emailResult = await sendOtpEmail(normalizedEmail, name.trim(), code, "verify");
    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Account created. Please verify your email." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
