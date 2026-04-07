/**
 * Detects and fixes denormalized ranked stats when set scores / pointsPerSet no longer
 * match what was applied at completion time (Player.rating, matchesPlayed, matchesWon,
 * streaks, MatchParticipant.rankedRatingDelta).
 *
 * Replays every COMPLETED non-friendly match in `createdAt` order from a clean baseline
 * (rating 1000, zero counters), mirroring `completeMatch` in `src/app/api/matches/[id]/route.ts`.
 *
 *   npx tsx scripts/repair-ranked-stats.ts           # dry-run: report only
 *   npx tsx scripts/repair-ranked-stats.ts --apply   # write fixes
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getCompletedMatchOutcome } from "../src/lib/matchWinningTeam";
import { calculateEloChange, calculateTeamRating } from "../src/lib/elo";

type PlayerState = {
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
  currentWinStreak: number;
  bestWinStreak: number;
};

function initialState(): PlayerState {
  return {
    rating: 1000,
    matchesPlayed: 0,
    matchesWon: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
  };
}

function winStreakBaselines(p: PlayerState) {
  return {
    current: p.currentWinStreak,
    best: p.bestWinStreak,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");

  const matches = await prisma.match.findMany({
    where: { status: "COMPLETED", isFriendly: false },
    include: {
      participants: { include: { player: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const stateByPlayer = new Map<string, PlayerState>();
  const deltasByKey = new Map<string, number>(); // `${matchId}:${playerId}`

  function ensurePlayer(id: string): PlayerState {
    let s = stateByPlayer.get(id);
    if (!s) {
      s = initialState();
      stateByPlayer.set(id, s);
    }
    return s;
  }

  const completedLogs = await prisma.eventLog.findMany({
    where: {
      entityType: "Match",
      action: "COMPLETED",
      entityId: { in: matches.map((m) => m.id) },
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, newValue: true, createdAt: true },
  });
  const logByMatchId = new Map<string, (typeof completedLogs)[0]>();
  for (const row of completedLogs) {
    if (!logByMatchId.has(row.entityId)) {
      logByMatchId.set(row.entityId, row);
    }
  }

  const mismatches: Array<{
    matchId: string;
    createdAt: Date;
    loggedWinner: string | null;
    outcomeWinner: string | null;
    reason: string;
  }> = [];

  for (const match of matches) {
    const outcome = getCompletedMatchOutcome({
      sets: match.sets,
      totalSets: match.totalSets,
      pointsPerSet: match.pointsPerSet,
    });

    const log = logByMatchId.get(match.id);

    const logged = log?.newValue as
      | { winningTeam?: string }
      | null
      | undefined;
    const loggedWinner =
      logged && typeof logged.winningTeam === "string"
        ? logged.winningTeam
        : null;

    if (!outcome) {
      mismatches.push({
        matchId: match.id,
        createdAt: match.createdAt,
        loggedWinner,
        outcomeWinner: null,
        reason: "No decisive outcome from current sets + totalSets + pointsPerSet",
      });
      continue;
    }

    if (loggedWinner && loggedWinner !== outcome.winningTeam) {
      mismatches.push({
        matchId: match.id,
        createdAt: match.createdAt,
        loggedWinner,
        outcomeWinner: outcome.winningTeam,
        reason: "Event log winningTeam differs from recomputed outcome",
      });
    }

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

  const rankedPlayerIds = new Set(stateByPlayer.keys());

  console.log("--- Ranked completed matches (non-friendly):", matches.length);
  console.log("--- Players with at least one ranked completed match:", rankedPlayerIds.size);

  if (mismatches.length > 0) {
    console.log("\n--- Detected issues (log vs recomputed sets) ---");
    for (const m of mismatches) {
      console.log(
        `match ${m.matchId} @ ${m.createdAt.toISOString()}\n  ${m.reason}\n  logged winningTeam: ${m.loggedWinner ?? "n/a"}  recomputed: ${m.outcomeWinner ?? "n/a"}`
      );
    }
  } else {
    console.log("\n--- No event-log vs outcome mismatches (or no COMPLETED logs). ---");
  }

  const diffs: Array<{
    playerId: string;
    field: string;
    db: number;
    replay: number;
  }> = [];

  for (const pid of rankedPlayerIds) {
    const replay = stateByPlayer.get(pid)!;
    const row = await prisma.player.findUnique({
      where: { id: pid },
      select: {
        rating: true,
        matchesPlayed: true,
        matchesWon: true,
        currentWinStreak: true,
        bestWinStreak: true,
      },
    });
    if (!row) continue;

    const check = (
      field: keyof typeof row,
      expected: number,
      actual: number
    ) => {
      if (expected !== actual) {
        diffs.push({ playerId: pid, field, db: actual, replay: expected });
      }
    };

    check("rating", replay.rating, row.rating);
    check("matchesPlayed", replay.matchesPlayed, row.matchesPlayed);
    check("matchesWon", replay.matchesWon, row.matchesWon);
    check("currentWinStreak", replay.currentWinStreak, row.currentWinStreak);
    check("bestWinStreak", replay.bestWinStreak, row.bestWinStreak);
  }

  const deltaMismatches: Array<{
    matchId: string;
    playerId: string;
    db: number | null;
    replay: number;
  }> = [];

  for (const match of matches) {
    const outcome = getCompletedMatchOutcome({
      sets: match.sets,
      totalSets: match.totalSets,
      pointsPerSet: match.pointsPerSet,
    });
    if (!outcome) continue;

    for (const part of match.participants) {
      const key = `${match.id}:${part.playerId}`;
      const expected = deltasByKey.get(key);
      if (expected === undefined) continue;
      if (part.rankedRatingDelta !== expected) {
        deltaMismatches.push({
          matchId: match.id,
          playerId: part.playerId,
          db: part.rankedRatingDelta,
          replay: expected,
        });
      }
    }
  }

  if (diffs.length === 0 && deltaMismatches.length === 0) {
    console.log(
      "\n--- DB already matches full replay (players + per-match deltas). Nothing to do. ---"
    );
    return;
  }

  if (diffs.length > 0) {
    console.log("\n--- Player field differences (db vs replay) ---");
    for (const d of diffs) {
      console.log(
        `  ${d.playerId}  ${d.field}: db=${d.db}  replay=${d.replay}`
      );
    }
  }

  if (deltaMismatches.length > 0) {
    console.log("\n--- MatchParticipant.rankedRatingDelta differences ---");
    for (const d of deltaMismatches) {
      console.log(
        `  match ${d.matchId} player ${d.playerId}: db=${d.db}  replay=${d.replay}`
      );
    }
  }

  if (!apply) {
    console.log(
      "\nDry-run only. Re-run with --apply to write corrected values from replay."
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const pid of rankedPlayerIds) {
      const s = stateByPlayer.get(pid)!;
      await tx.player.update({
        where: { id: pid },
        data: {
          rating: s.rating,
          matchesPlayed: s.matchesPlayed,
          matchesWon: s.matchesWon,
          currentWinStreak: s.currentWinStreak,
          bestWinStreak: s.bestWinStreak,
        },
      });
    }

    for (const match of matches) {
      const outcome = getCompletedMatchOutcome({
        sets: match.sets,
        totalSets: match.totalSets,
        pointsPerSet: match.pointsPerSet,
      });
      if (!outcome) continue;

      for (const part of match.participants) {
        const key = `${match.id}:${part.playerId}`;
        const delta = deltasByKey.get(key);
        if (delta === undefined) continue;
        await tx.matchParticipant.update({
          where: {
            matchId_playerId: { matchId: match.id, playerId: part.playerId },
          },
          data: { rankedRatingDelta: delta },
        });
      }
    }
  });

  const decidedCount = matches.filter(
    (m) =>
      getCompletedMatchOutcome({
        sets: m.sets,
        totalSets: m.totalSets,
        pointsPerSet: m.pointsPerSet,
      }) !== null
  ).length;

  console.log(
    `\nApplied replay: updated ${rankedPlayerIds.size} players and participant deltas for ${decidedCount} decided ranked matches.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
