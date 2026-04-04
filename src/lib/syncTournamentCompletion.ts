import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TOURNAMENTS_LIST_CACHE_TAG } from "@/lib/get-tournaments-list";

/**
 * After a tournament slot match is marked completed, set tournament to COMPLETED
 * with winner/runner-up when the whole event is finished.
 */
export async function syncTournamentCompletionAfterMatch(
  completedTournamentMatchId: string
): Promise<void> {
  const tm = await prisma.tournamentMatch.findUnique({
    where: { id: completedTournamentMatchId },
    include: { tournament: true },
  });

  if (!tm || tm.tournament.status === "COMPLETED") {
    return;
  }

  const tournamentId = tm.tournamentId;

  if (tm.tournament.type === "ROUND_ROBIN") {
    const pending = await prisma.tournamentMatch.count({
      where: { tournamentId, status: { not: "COMPLETED" } },
    });
    if (pending > 0) {
      return;
    }

    const allMatches = await prisma.tournamentMatch.findMany({
      where: { tournamentId },
      select: { winnerId: true },
    });
    const teamRows = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true },
    });
    const wins = new Map<string, number>();
    for (const t of teamRows) {
      wins.set(t.id, 0);
    }
    for (const m of allMatches) {
      if (m.winnerId) {
        wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1);
      }
    }
    const sorted = [...wins.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    if (sorted.length === 0) {
      return;
    }
    const winnerTeamId = sorted[0][0];
    const runnerUpTeamId = sorted.length > 1 ? sorted[1][0] : null;

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "COMPLETED",
        winnerTeamId,
        runnerUpTeamId,
      },
    });
    revalidateTag(TOURNAMENTS_LIST_CACHE_TAG, "max");
    return;
  }

  const maxRoundAgg = await prisma.tournamentMatch.aggregate({
    where: { tournamentId },
    _max: { round: true },
  });
  const maxRound = maxRoundAgg._max.round ?? 0;
  if (tm.round !== maxRound || tm.status !== "COMPLETED" || !tm.winnerId) {
    return;
  }

  const loserId =
    tm.winnerId === tm.teamAId ? tm.teamBId : tm.teamAId;

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "COMPLETED",
      winnerTeamId: tm.winnerId,
      runnerUpTeamId: loserId,
    },
  });

  revalidateTag(TOURNAMENTS_LIST_CACHE_TAG, "max");
}
