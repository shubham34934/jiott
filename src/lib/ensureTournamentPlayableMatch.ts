import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";

/**
 * Creates a playable Match + links it to the tournament slot when both teams are set
 * and no Match exists yet. Sets TournamentMatch status to ONGOING.
 */
export async function ensureTournamentPlayableMatch(
  tournamentMatchId: string,
  createdByUserId: string
): Promise<void> {
  const tm = await prisma.tournamentMatch.findUnique({
    where: { id: tournamentMatchId },
    include: { tournament: true },
  });

  if (!tm || tm.matchId || !tm.teamAId || !tm.teamBId) {
    return;
  }

  const [teamA, teamB] = await Promise.all([
    prisma.team.findUnique({ where: { id: tm.teamAId } }),
    prisma.team.findUnique({ where: { id: tm.teamBId } }),
  ]);

  if (!teamA || !teamB) {
    return;
  }

  const matchType = tm.tournament.matchType;
  if (matchType === "DOUBLES") {
    if (
      !teamA.player2Id ||
      !teamB.player2Id
    ) {
      return;
    }
  }

  const playerIds =
    matchType === "SINGLES"
      ? [teamA.player1Id, teamB.player1Id]
      : [
          teamA.player1Id,
          teamA.player2Id!,
          teamB.player1Id,
          teamB.player2Id!,
        ];

  const maxRoundAgg = await prisma.tournamentMatch.aggregate({
    where: { tournamentId: tm.tournamentId },
    _max: { round: true },
  });
  const maxRound = maxRoundAgg._max.round ?? tm.round;

  const isRoundRobin = tm.tournament.type === "ROUND_ROBIN";
  const isKnockoutFinal =
    !isRoundRobin && tm.round === maxRound;

  const totalSets = isKnockoutFinal ? 5 : 3;
  const pointsPerSet = 11;

  await prisma.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        type: matchType,
        totalSets,
        pointsPerSet,
        isFriendly: false,
        createdBy: createdByUserId,
        participants: {
          create: playerIds.map((playerId, index) => ({
            playerId,
            team:
              matchType === "SINGLES"
                ? index === 0
                  ? ("A" as const)
                  : ("B" as const)
                : index < 2
                  ? ("A" as const)
                  : ("B" as const),
          })),
        },
        sets: {
          create: Array.from({ length: totalSets }, (_, i) => ({
            setNumber: i + 1,
          })),
        },
      },
    });

    await tx.tournamentMatch.update({
      where: { id: tournamentMatchId },
      data: { matchId: created.id, status: "ONGOING" },
    });

    await tx.eventLog.create({
      data: {
        entityType: "Match",
        entityId: created.id,
        action: "CREATED",
        newValue: {
          type: matchType,
          playerIds,
          totalSets,
          pointsPerSet,
          isFriendly: false,
          tournamentMatchId,
        },
        updatedBy: createdByUserId,
        matchId: created.id,
      },
    });
  });

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");
}
