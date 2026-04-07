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
import {
  applyReplayedRankedStats,
  computeRankedStatsReplay,
} from "../src/lib/replay-ranked-stats";

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
  }

  const rows = matches.map((m) => ({
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

  const { playerStates: stateByPlayer, deltasByKey } =
    computeRankedStatsReplay(rows);

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
    await applyReplayedRankedStats(tx);
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
