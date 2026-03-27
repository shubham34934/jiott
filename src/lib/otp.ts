import { prisma } from "./prisma";
import { OtpType } from "@prisma/client";

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(email: string, type: OtpType): Promise<string> {
  // Invalidate any existing unused OTPs for this email+type
  await prisma.otpCode.updateMany({
    where: { email, type, used: false },
    data: { used: true },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpCode.create({
    data: { email, code, type, expiresAt },
  });

  return code;
}

export async function verifyOtp(
  email: string,
  code: string,
  type: OtpType
): Promise<{ valid: boolean; error?: string }> {
  const otp = await prisma.otpCode.findFirst({
    where: { email, code, type, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { valid: false, error: "Invalid or expired code. Please try again." };
  }

  if (otp.expiresAt < new Date()) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
    return { valid: false, error: "Code has expired. Please request a new one." };
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  return { valid: true };
}
