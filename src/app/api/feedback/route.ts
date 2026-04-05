import { NextResponse } from "next/server";
import { FeedbackCategory } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set<string>(Object.values(FeedbackCategory));
const MAX_MESSAGE = 5000;
const MAX_PATH = 500;

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
  const message =
    typeof raw.message === "string" ? raw.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: "Message is required (max 5000 characters)" },
      { status: 400 }
    );
  }

  let category: FeedbackCategory = FeedbackCategory.GENERAL;
  if (typeof raw.category === "string" && CATEGORIES.has(raw.category)) {
    category = raw.category as FeedbackCategory;
  }

  let contactEmail: string | null = null;
  if (typeof raw.contactEmail === "string") {
    const e = raw.contactEmail.trim().toLowerCase();
    if (e) {
      if (!isValidEmail(e) || e.length > 255) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      contactEmail = e;
    }
  }

  let pagePath: string | null = null;
  if (typeof raw.pagePath === "string") {
    const p = raw.pagePath.trim().slice(0, MAX_PATH);
    if (p.startsWith("/")) pagePath = p;
  }

  let userId: string | null = null;
  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  }

  await prisma.feedback.create({
    data: {
      category,
      message,
      contactEmail: userId ? null : contactEmail,
      pagePath,
      userId,
    },
  });

  return NextResponse.json({ ok: true });
}
