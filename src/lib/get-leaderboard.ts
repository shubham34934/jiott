import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const LEADERBOARD_CACHE_TAG = "leaderboard-list";

/**
 * Leaderboard reads denormalized `Player.rating`, `matchesPlayed`, and `matchesWon`.
 * Those fields are updated only when a non-friendly match is completed
 * (`PATCH .../matches/[id]` action `complete`), not on every request.
 */
export async function getLeaderboardPlayersData() {
  return prisma.player.findMany({
    select: {
      id: true,
      rating: true,
      matchesPlayed: true,
      matchesWon: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
  });
}

export function getLeaderboardPlayersCached() {
  return unstable_cache(
    () => getLeaderboardPlayersData(),
    ["leaderboard-players"],
    { revalidate: 30, tags: [LEADERBOARD_CACHE_TAG] }
  )();
}
