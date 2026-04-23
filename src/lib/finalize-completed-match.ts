import { prisma } from "@/lib/prisma";
import { applyReplayedRankedStats } from "@/lib/replay-ranked-stats";
import { ensureTournamentPlayableMatch } from "@/lib/ensureTournamentPlayableMatch";
import { syncTournamentCompletionAfterMatch } from "@/lib/syncTournamentCompletion";
import { revalidateTag } from "next/cache";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { LEADERBOARD_CACHE_TAG } from "@/lib/get-leaderboard";
import { PLAYERS_LIST_CACHE_TAG } from "@/lib/get-players-list";

/**
 * Run the heavy side effects of a match entering COMPLETED:
 *   - replay ranked stats (unless friendly)
 *   - advance tournament bracket (if any)
 *   - invalidate list caches
 *
 * Idempotent replay is safe to call when a match moves *out* of COMPLETED too.
 */
export async function finalizeCompletedMatch({
  matchId,
  actorUserId,
  isFriendly,
  winningTeam,
}: {
  matchId: string;
  actorUserId: string;
  isFriendly: boolean;
  winningTeam: "A" | "B";
}) {
  if (!isFriendly) {
    await prisma.$transaction((tx) => applyReplayedRankedStats(tx), {
      timeout: 30_000,
      maxWait: 10_000,
    });
  }

  const tournamentMatch = await prisma.tournamentMatch.findFirst({
    where: { matchId },
  });

  if (tournamentMatch) {
    const winnerId =
      winningTeam === "A"
        ? tournamentMatch.teamAId
        : tournamentMatch.teamBId;

    await prisma.tournamentMatch.update({
      where: { id: tournamentMatch.id },
      data: { status: "COMPLETED", winnerId },
    });

    const nextDeps = await prisma.matchDependency.findMany({
      where: { dependsOnMatchId: tournamentMatch.id },
      include: { match: true },
    });

    for (const dep of nextDeps) {
      const updateData =
        dep.slot === "A"
          ? { teamAId: winnerId }
          : { teamBId: winnerId };

      await prisma.tournamentMatch.update({
        where: { id: dep.matchId },
        data: updateData,
      });

      const refreshed = await prisma.tournamentMatch.findUnique({
        where: { id: dep.matchId },
      });

      if (refreshed?.teamAId && refreshed?.teamBId) {
        await ensureTournamentPlayableMatch(refreshed.id, actorUserId);
      }
    }

    await syncTournamentCompletionAfterMatch(tournamentMatch.id);
  }

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");
  revalidateTag(LEADERBOARD_CACHE_TAG, "max");
  revalidateTag(PLAYERS_LIST_CACHE_TAG, "max");
}

/** Called when a match LEAVES COMPLETED (set edit or re-open). Just replays stats + revalidates lists. */
export async function undoCompletedMatchSideEffects(isFriendly: boolean) {
  if (!isFriendly) {
    await prisma.$transaction((tx) => applyReplayedRankedStats(tx), {
      timeout: 30_000,
      maxWait: 10_000,
    });
  }
  revalidateTag(MATCH_LIST_CACHE_TAG, "max");
  revalidateTag(LEADERBOARD_CACHE_TAG, "max");
  revalidateTag(PLAYERS_LIST_CACHE_TAG, "max");
}
