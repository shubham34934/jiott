import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";

export async function POST(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { id?: unknown; all?: unknown }
    | null;

  const now = new Date();

  if (body?.all === true) {
    const result = await prisma.notification.updateMany({
      where: { userId: actor.prismaUserId, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ updated: result.count });
  }

  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json(
      { error: "Missing `id` or `all: true`." },
      { status: 400 }
    );
  }

  const result = await prisma.notification.updateMany({
    where: { id, userId: actor.prismaUserId, readAt: null },
    data: { readAt: now },
  });
  return NextResponse.json({ updated: result.count });
}
