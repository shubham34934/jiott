import type { Prisma } from "@prisma/client";
import { calculateEloChange, calculateTeamRating } from "@/lib/elo";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";

/** Denormalized snapshot for one player after replaying ranked history from a 1000 baseline. */
export type RankedPlayerReplayState = {
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
  currentWinStreak: number;
  bestWinStreak: number;
};

export function initialRankedPlayerReplayState(): RankedPlayerReplayState {
  return {
    rating: 1000,
    matchesPlayed: 0,
    matchesWon: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
  };
}

export type MatchRowForReplay = {
  id: string;
  totalSets: number;
  pointsPerSet: number;
  createdAt: Date;
  participants: Array<{ playerId: string; team: "A" | "B" }>;
  sets: Array<{ teamAScore: number; teamBScore: number }>;
};

/**
 * Replays all ranked (non-friendly) completed matches in `createdAt` order from a clean
 * baseline. Mirrors the Elo + streak rules used when completing a match.
 */
export function computeRankedStatsReplay(matchesSorted: MatchRowForReplay[]): {
  playerStates: Map<string, RankedPlayerReplayState>;
  deltasByKey: Map<string, number>;
} {
  const playerStates = new Map<string, RankedPlayerReplayState>();
  const deltasByKey = new Map<string, number>();

  function ensurePlayer(id: string): RankedPlayerReplayState {
    let s = playerStates.get(id);
    if (!s) {
      s = initialRankedPlayerReplayState();
      playerStates.set(id, s);
    }
    return s;
  }

  function winStreakBaselines(p: RankedPlayerReplayState) {
    return { current: p.currentWinStreak, best: p.bestWinStreak };
  }

  for (const match of matchesSorted) {
    const outcome = getCompletedMatchOutcome({
      sets: match.sets,
      totalSets: match.totalSets,
      pointsPerSet: match.pointsPerSet,
    });
    if (!outcome) continue;

    const { winningTeam } = outcome;
    const losingTeam = winningTeam === "A" ? "B" : "A";
    const winners = match.participants.filter((p) => p.team === winningTeam);
    const losers = match.participants.filter((p) => p.team === losingTeam);

    const winnerRatings = winners.map((w) => ensurePlayer(w.playerId).rating);
    const loserRatings = losers.map((l) => ensurePlayer(l.playerId).rating);

    const avgWinnerRating = calculateTeamRating(winnerRatings);
    const avgLoserRating = calculateTeamRating(loserRatings);

    const { winnerNew, loserNew } = calculateEloChange(
      avgWinnerRating,
      avgLoserRating
    );

    const winnerDelta = winnerNew - avgWinnerRating;
    const loserDelta = loserNew - avgLoserRating;

    for (const w of winners) {
      const pid = w.playerId;
      const p = ensurePlayer(pid);
      const { current: prevCurrent, best: prevBest } = winStreakBaselines(p);
      const nextCurrent = prevCurrent + 1;
      const nextBest = Math.max(prevBest, nextCurrent);

      p.rating += winnerDelta;
      p.matchesPlayed += 1;
      p.matchesWon += 1;
      p.currentWinStreak = nextCurrent;
      p.bestWinStreak = nextBest;

      deltasByKey.set(`${match.id}:${pid}`, winnerDelta);
    }

    for (const l of losers) {
      const pid = l.playerId;
      const p = ensurePlayer(pid);
      p.rating += loserDelta;
      p.matchesPlayed += 1;
      p.currentWinStreak = 0;

      deltasByKey.set(`${match.id}:${pid}`, loserDelta);
    }
  }

  return { playerStates, deltasByKey };
}

/**
 * Writes replayed ranked stats for every player who appears in at least one completed
 * non-friendly match, and updates `MatchParticipant.rankedRatingDelta` for decided matches.
 *
 * Call after a ranked match is completed or deleted so denormalized fields always match
 * a full chronological replay (no drift from incremental updates).
 *
 * `alsoResetPlayerIds`: e.g. participants of a deleted match — if they no longer appear
 * in any ranked completed match after replay, reset their stats to the baseline.
 */
export async function applyReplayedRankedStats(
  tx: Prisma.TransactionClient,
  options?: { alsoResetPlayerIds?: readonly string[] }
): Promise<void> {
  const matches = await tx.match.findMany({
    where: { status: "COMPLETED", isFriendly: false },
    include: {
      participants: { select: { playerId: true, team: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: MatchRowForReplay[] = matches.map((m) => ({
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
  }));

  const { playerStates, deltasByKey } = computeRankedStatsReplay(rows);

  for (const [playerId, state] of playerStates) {
    await tx.player.update({
      where: { id: playerId },
      data: {
        rating: state.rating,
        matchesPlayed: state.matchesPlayed,
        matchesWon: state.matchesWon,
        currentWinStreak: state.currentWinStreak,
        bestWinStreak: state.bestWinStreak,
      },
    });
  }

  for (const m of matches) {
    const outcome = getCompletedMatchOutcome({
      sets: m.sets,
      totalSets: m.totalSets,
      pointsPerSet: m.pointsPerSet,
    });
    if (!outcome) continue;

    for (const part of m.participants) {
      const key = `${m.id}:${part.playerId}`;
      const delta = deltasByKey.get(key);
      if (delta === undefined) continue;
      await tx.matchParticipant.update({
        where: {
          matchId_playerId: { matchId: m.id, playerId: part.playerId },
        },
        data: { rankedRatingDelta: delta },
      });
    }
  }

  const resetIds = options?.alsoResetPlayerIds ?? [];
  for (const pid of resetIds) {
    if (!playerStates.has(pid)) {
      const init = initialRankedPlayerReplayState();
      await tx.player.update({
        where: { id: pid },
        data: {
          rating: init.rating,
          matchesPlayed: init.matchesPlayed,
          matchesWon: init.matchesWon,
          currentWinStreak: init.currentWinStreak,
          bestWinStreak: init.bestWinStreak,
        },
      });
    }
  }
}
