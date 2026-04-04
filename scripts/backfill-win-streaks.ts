/**
 * Recomputes `currentWinStreak` and `bestWinStreak` from ranked (non-friendly)
 * completed matches, ordered by `Match.createdAt`.
 *
 *   npx tsx scripts/backfill-win-streaks.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getCompletedMatchOutcome } from "../src/lib/matchWinningTeam";

async function main() {
  const players = await prisma.player.findMany({ select: { id: true } });

  for (const { id } of players) {
    const participations = await prisma.matchParticipant.findMany({
      where: { playerId: id },
      include: {
        match: {
          include: { sets: { orderBy: { setNumber: "asc" } } },
        },
      },
    });

    const ranked = participations
      .filter(
        (p) =>
          p.match.status === "COMPLETED" &&
          !p.match.isFriendly &&
          p.match.sets.length > 0
      )
      .sort(
        (a, b) =>
          new Date(a.match.createdAt).getTime() -
          new Date(b.match.createdAt).getTime()
      );

    let current = 0;
    let best = 0;
    for (const mp of ranked) {
      const outcome = getCompletedMatchOutcome(mp.match);
      if (!outcome) continue;
      const won = outcome.winningTeam === mp.team;
      if (won) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }

    await prisma.player.update({
      where: { id },
      data: { currentWinStreak: current, bestWinStreak: best },
    });
  }

  console.log(`Updated win streaks for ${players.length} players.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
