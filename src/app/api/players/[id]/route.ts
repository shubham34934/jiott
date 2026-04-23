import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isPrismaMissingColumnError,
  matchParticipantWithPlayerForApi,
  mergeRankedRatingDeltasForMatches,
} from "@/lib/match-participant-queries";
import { computeRatingHistoryForPlayer } from "@/lib/replay-ranked-stats";
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

  // Wave 1 — all independent of each other.
  const [player, streakRow, tournamentTeams, rankedMatchesRaw] =
    await Promise.all([
      prisma.player.findUnique({
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
      }),
      prisma.player
        .findUnique({
          where: { id },
          select: { currentWinStreak: true, bestWinStreak: true },
        })
        .catch((e: unknown) => {
          if (isPrismaMissingColumnError(e)) return null;
          throw e;
        }),
      prisma.team.findMany({
        where: { OR: [{ player1Id: id }, { player2Id: id }] },
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
      }),
      prisma.match.findMany({
        where: { status: "COMPLETED", isFriendly: false },
        include: {
          participants: { select: { playerId: true, team: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const currentWinStreak = streakRow?.currentWinStreak ?? 0;
  const bestWinStreak = streakRow?.bestWinStreak ?? 0;

  const participationMatchIds = player.matchParticipations.map(
    (mp) => mp.match.id
  );
  const participationMatches = player.matchParticipations.map((mp) => mp.match);

  // Wave 2 — all depend only on `player`, independent of each other.
  const [aheadCount, linkedRows, matchesWithDeltas] = await Promise.all([
    prisma.player.count({
      where: {
        OR: [
          { rating: { gt: player.rating } },
          { AND: [{ rating: player.rating }, { id: { lt: player.id } }] },
        ],
      },
    }),
    participationMatchIds.length > 0
      ? prisma.tournamentMatch.findMany({
          where: { matchId: { in: participationMatchIds } },
          select: {
            matchId: true,
            tournament: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    mergeRankedRatingDeltasForMatches(participationMatches),
  ]);

  const _rank = aheadCount + 1;

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

  const matchById = new Map(matchesWithDeltas.map((m) => [m.id, m]));

  const matchParticipations = player.matchParticipations.map((mp) => ({
    ...mp,
    match: {
      ...matchById.get(mp.match.id)!,
      isTournamentMatch: linkedSet.has(mp.match.id),
      tournamentName: tournamentNameByMatchId.get(mp.match.id) ?? null,
    },
  }));

  const ratingHistory = computeRatingHistoryForPlayer(
    rankedMatchesRaw.map((m) => ({
      id: m.id,
      totalSets: m.totalSets,
      pointsPerSet: m.pointsPerSet,
      createdAt: m.createdAt,
      participants: m.participants.map((p) => ({
        playerId: p.playerId,
        team: p.team,
      })),
      sets: m.sets.map((s) => ({
        teamAScore: s.teamAScore,
        teamBScore: s.teamBScore,
      })),
    })),
    id
  );

  return NextResponse.json(
    {
      ...player,
      currentWinStreak,
      bestWinStreak,
      _rank,
      matchParticipations,
      tournamentTeams,
      ratingHistory,
    },
    { headers: JSON_NO_STORE_HEADERS }
  );
}
