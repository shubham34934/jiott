import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const TOURNAMENTS_LIST_CACHE_TAG = "tournaments-list";

export async function getTournamentsListData() {
  return prisma.tournament.findMany({
    include: {
      _count: { select: { matches: true, teams: true } },
      matches: {
        orderBy: { round: "desc" },
        take: 1,
        include: {
          winner: {
            include: {
              player1: {
                include: { user: { select: { name: true } } },
              },
              player2: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getTournamentsListCached() {
  return unstable_cache(
    () => getTournamentsListData(),
    ["tournaments-list"],
    { revalidate: 30, tags: [TOURNAMENTS_LIST_CACHE_TAG] }
  )();
}
