import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isPrismaMissingColumnError,
  matchParticipantWithPlayerForApi,
  mergeRankedRatingDeltasForMatches,
} from "@/lib/match-participant-queries";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

const tournamentTeamPlayerSelect = {
  select: {
    id: true,
    user: { select: { name: true, image: true } },
  },
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      rating: true,
      matchesPlayed: true,
      matchesWon: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true, image: true } },
      matchParticipations: {
        select: {
          id: true,
          matchId: true,
          playerId: true,
          team: true,
          match: {
            select: {
              id: true,
              type: true,
              status: true,
              totalSets: true,
              pointsPerSet: true,
              isFriendly: true,
              createdBy: true,
              createdAt: true,
              updatedAt: true,
              participants: matchParticipantWithPlayerForApi,
              sets: {
                orderBy: { setNumber: "asc" },
                select: {
                  id: true,
                  matchId: true,
                  setNumber: true,
                  teamAScore: true,
                  teamBScore: true,
                },
              },
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

  const participationMatches = player.matchParticipations.map((mp) => mp.match);
  const matchesWithDeltas =
    await mergeRankedRatingDeltasForMatches(participationMatches);
  const matchById = new Map(matchesWithDeltas.map((m) => [m.id, m]));

  const matchParticipations = player.matchParticipations.map((mp) => ({
    ...mp,
    match: {
      ...matchById.get(mp.match.id)!,
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
              player1: tournamentTeamPlayerSelect,
              player2: tournamentTeamPlayerSelect,
            },
          },
          runnerUpTeam: {
            include: {
              player1: tournamentTeamPlayerSelect,
              player2: tournamentTeamPlayerSelect,
            },
          },
        },
      },
    },
    orderBy: { tournament: { createdAt: "desc" } },
  });

  let currentWinStreak = 0;
  let bestWinStreak = 0;
  try {
    const streakRow = await prisma.player.findUnique({
      where: { id },
      select: { currentWinStreak: true, bestWinStreak: true },
    });
    if (streakRow) {
      currentWinStreak = streakRow.currentWinStreak ?? 0;
      bestWinStreak = streakRow.bestWinStreak ?? 0;
    }
  } catch (e) {
    if (!isPrismaMissingColumnError(e)) throw e;
  }

  return NextResponse.json(
    {
      ...player,
      currentWinStreak,
      bestWinStreak,
      _rank,
      matchParticipations,
      tournamentTeams,
    },
    { headers: JSON_NO_STORE_HEADERS }
  );
}
