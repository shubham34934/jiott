import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const PLAYERS_LIST_CACHE_TAG = "players-list";

const SORT_FIELDS = ["rating", "matchesPlayed", "matchesWon"] as const;
export type PlayersListSortField = (typeof SORT_FIELDS)[number];

export type PlayersListParams = {
  sortBy: PlayersListSortField;
  q: string;
  limit: number;
  offset: number;
};

export function parsePlayersListSort(raw: string | null): PlayersListSortField {
  if (raw && SORT_FIELDS.includes(raw as PlayersListSortField)) {
    return raw as PlayersListSortField;
  }
  return "rating";
}

export async function getPlayersListData(params: PlayersListParams) {
  const { sortBy, q, limit, offset } = params;

  const orderBy =
    sortBy === "matchesPlayed"
      ? { matchesPlayed: "desc" as const }
      : sortBy === "matchesWon"
        ? { matchesWon: "desc" as const }
        : { rating: "desc" as const };

  const where =
    q.length > 0
      ? {
          user: {
            name: { contains: q, mode: "insensitive" as const },
          },
        }
      : undefined;

  const total = await prisma.player.count({ where });

  const players = await prisma.player.findMany({
    where,
    select: {
      id: true,
      rating: true,
      matchesPlayed: true,
      matchesWon: true,
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy,
    skip: offset,
    take: limit + 1,
  });

  const hasMore = players.length > limit;
  const items = hasMore ? players.slice(0, limit) : players;

  return {
    items,
    hasMore,
    nextOffset: offset + items.length,
    total,
  };
}

export function getPlayersListCached(params: PlayersListParams) {
  const key = JSON.stringify(params);
  return unstable_cache(
    () => getPlayersListData(params),
    ["players-list", key],
    { revalidate: 30, tags: [PLAYERS_LIST_CACHE_TAG] }
  )();
}
