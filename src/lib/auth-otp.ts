import crypto from "node:crypto";
import type { OtpType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 10 * 60 * 1000;

export function generateOtpDigits(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function invalidateUnusedOtps(email: string, type: OtpType) {
  await prisma.otpCode.updateMany({
    where: { email, type, used: false },
    data: { used: true },
  });
}

export async function createOtpRecord(
  email: string,
  type: OtpType
): Promise<string> {
  const code = generateOtpDigits();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await invalidateUnusedOtps(email, type);
  await prisma.otpCode.create({
    data: { email, code, type, expiresAt },
  });
  return code;
}

export async function consumeOtp(
  email: string,
  code: string,
  type: OtpType
): Promise<boolean> {
  const row = await prisma.otpCode.findFirst({
    where: {
      email,
      code,
      type,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return false;
  await prisma.otpCode.update({
    where: { id: row.id },
    data: { used: true },
  });
  return true;
}
