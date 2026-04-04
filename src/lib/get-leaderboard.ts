import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const LEADERBOARD_CACHE_TAG = "leaderboard-list";

export async function getLeaderboardPlayersData() {
  return prisma.player.findMany({
    include: {
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
