import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = status ? { status: status as "ONGOING" | "COMPLETED" } : {};

  const matches = await prisma.match.findMany({
    where,
    include: {
      participants: {
        include: {
          player: {
            include: {
              user: { select: { name: true, image: true } },
            },
          },
        },
      },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, playerIds, totalSets, pointsPerSet } = body;

  if (type === "SINGLES" && playerIds.length !== 2) {
    return NextResponse.json(
      { error: "Singles requires exactly 2 players" },
      { status: 400 }
    );
  }
  if (type === "DOUBLES" && playerIds.length !== 4) {
    return NextResponse.json(
      { error: "Doubles requires exactly 4 players" },
      { status: 400 }
    );
  }

  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== playerIds.length) {
    return NextResponse.json(
      { error: "Duplicate players not allowed" },
      { status: 400 }
    );
  }

  const match = await prisma.match.create({
    data: {
      type,
      totalSets: totalSets || 3,
      pointsPerSet: pointsPerSet || 11,
      createdBy: session.user.id,
      participants: {
        create: playerIds.map((playerId: string, index: number) => ({
          playerId,
          team: type === "SINGLES"
            ? index === 0 ? "A" : "B"
            : index < 2 ? "A" : "B",
        })),
      },
      sets: {
        create: Array.from({ length: totalSets || 3 }, (_, i) => ({
          setNumber: i + 1,
        })),
      },
    },
    include: {
      participants: {
        include: {
          player: {
            include: {
              user: { select: { name: true, image: true } },
            },
          },
        },
      },
      sets: { orderBy: { setNumber: "asc" } },
    },
  });

  await prisma.eventLog.create({
    data: {
      entityType: "Match",
      entityId: match.id,
      action: "CREATED",
      newValue: { type, playerIds, totalSets, pointsPerSet },
      updatedBy: session.user.id,
      matchId: match.id,
    },
  });

  return NextResponse.json(match, { status: 201 });
}
