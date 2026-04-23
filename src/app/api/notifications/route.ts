import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const rawLimit = parseInt(
    searchParams.get("limit") || String(DEFAULT_LIMIT),
    10
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit)
  );

  const where = {
    userId: actor.prismaUserId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        body: true,
        url: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: actor.prismaUserId, readAt: null },
    }),
  ]);

  return NextResponse.json(
    { items, unreadCount },
    { headers: JSON_NO_STORE_HEADERS }
  );
}
