import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const friendly = searchParams.get("friendly");
  const tournament = searchParams.get("tournament");
  const limit = parseInt(searchParams.get("limit") || "20");

  const linkedRows = await prisma.tournamentMatch.findMany({
    where: { matchId: { not: null } },
    select: { matchId: true },
  });
  const linkedMatchIds = [
    ...new Set(
      linkedRows
        .map((r) => r.matchId)
        .filter((id): id is string => id != null)
    ),
  ];
  const linkedSet = new Set(linkedMatchIds);

  const where: Record<string, unknown> = {};
  if (status) where.status = status as "ONGOING" | "COMPLETED";
  if (friendly === "true") where.isFriendly = true;

  if (tournament === "exclude" && linkedMatchIds.length > 0) {
    where.id = { notIn: linkedMatchIds };
  } else if (tournament === "only") {
    if (linkedMatchIds.length === 0) {
      return NextResponse.json([]);
    }
    where.id = { in: linkedMatchIds };
  }

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

  const matchIds = matches.map((m) => m.id);
  const tournamentLinks =
    matchIds.length > 0
      ? await prisma.tournamentMatch.findMany({
          where: { matchId: { in: matchIds } },
          select: {
            matchId: true,
            tournament: { select: { name: true } },
          },
        })
      : [];

  const tournamentNameByMatchId = new Map<string, string>();
  for (const row of tournamentLinks) {
    if (row.matchId && !tournamentNameByMatchId.has(row.matchId)) {
      tournamentNameByMatchId.set(row.matchId, row.tournament.name);
    }
  }

  const payload = matches.map((m) => ({
    ...m,
    isTournamentMatch: linkedSet.has(m.id),
    tournamentName: tournamentNameByMatchId.get(m.id) ?? null,
  }));

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, playerIds, totalSets, pointsPerSet, isFriendly } = body;

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
      isFriendly: isFriendly || false,
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
      newValue: { type, playerIds, totalSets, pointsPerSet, isFriendly: isFriendly || false },
      updatedBy: session.user.id,
      matchId: match.id,
    },
  });

  return NextResponse.json(match, { status: 201 });
}
