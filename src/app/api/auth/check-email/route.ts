import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ exists: false, verified: false });
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, password: true },
  });
  return NextResponse.json({
    exists: !!user?.password,
    verified: !!user?.emailVerified,
  });
}
