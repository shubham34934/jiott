import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, image: true } },
      matchParticipations: {
        include: {
          match: {
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
          },
        },
        orderBy: { match: { createdAt: "desc" } },
        take: 20,
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const aheadCount = await prisma.player.count({
    where: {
      OR: [
        { rating: { gt: player.rating } },
        { AND: [{ rating: player.rating }, { id: { lt: player.id } }] },
      ],
    },
  });
  const _rank = aheadCount + 1;

  const participationMatchIds = player.matchParticipations.map(
    (mp) => mp.match.id
  );
  const linkedRows =
    participationMatchIds.length > 0
      ? await prisma.tournamentMatch.findMany({
          where: { matchId: { in: participationMatchIds } },
          select: {
            matchId: true,
            tournament: { select: { name: true } },
          },
        })
      : [];
  const linkedSet = new Set(
    linkedRows
      .map((r) => r.matchId)
      .filter((mid): mid is string => mid != null)
  );
  const tournamentNameByMatchId = new Map<string, string>();
  for (const row of linkedRows) {
    if (row.matchId && !tournamentNameByMatchId.has(row.matchId)) {
      tournamentNameByMatchId.set(row.matchId, row.tournament.name);
    }
  }

  const matchParticipations = player.matchParticipations.map((mp) => ({
    ...mp,
    match: {
      ...mp.match,
      isTournamentMatch: linkedSet.has(mp.match.id),
      tournamentName: tournamentNameByMatchId.get(mp.match.id) ?? null,
    },
  }));

  const tournamentTeams = await prisma.team.findMany({
    where: {
      OR: [{ player1Id: id }, { player2Id: id }],
    },
    include: {
      tournament: {
        include: {
          winnerTeam: {
            include: {
              player1: {
                include: { user: { select: { name: true, image: true } } },
              },
              player2: {
                include: { user: { select: { name: true, image: true } } },
              },
            },
          },
          runnerUpTeam: {
            include: {
              player1: {
                include: { user: { select: { name: true, image: true } } },
              },
              player2: {
                include: { user: { select: { name: true, image: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { tournament: { createdAt: "desc" } },
  });

  return NextResponse.json({
    ...player,
    _rank,
    matchParticipations,
    tournamentTeams,
  });
}
