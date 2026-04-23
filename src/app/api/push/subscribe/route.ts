import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";

export async function POST(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sub = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  } | null;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh =
    typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Missing endpoint or keys" },
      { status: 400 }
    );
  }

  const userAgent = req.headers.get("user-agent") ?? null;

  const saved = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: actor.prismaUserId,
      endpoint,
      p256dh,
      auth,
      userAgent,
    },
    update: {
      userId: actor.prismaUserId,
      p256dh,
      auth,
      userAgent,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: saved.id });
}
