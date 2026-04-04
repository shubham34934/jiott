import type { QueryClient } from "@tanstack/react-query";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

const MATCHES_PAGE_SIZE = 20;
const PLAYERS_PAGE_SIZE = 20;

export type ListPageResponse = {
  items: unknown[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
};

/** Home “recent matches” slice — same key as `src/app/page.tsx`. */
export const dashboardMatchesPrefetch = {
  queryKey: ["matches", "dashboard", "recent", "exclude-tournament"] as const,
  staleTime: QUERY_STALE_TIME_MS,
  queryFn: () =>
    fetch("/api/matches?limit=5&offset=0&tournament=exclude").then((r) => {
      if (!r.ok) throw new Error("Failed to prefetch matches");
      return r.json();
    }),
};

export function prefetchMatchesListFirstPage(queryClient: QueryClient) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: ["matches", "infinite", "all", "regular", "all"],
    initialPageParam: 0,
    staleTime: QUERY_STALE_TIME_MS,
    queryFn: async ({
      pageParam,
    }: {
      pageParam: number;
    }): Promise<ListPageResponse> => {
      const params = new URLSearchParams();
      params.set("offset", String(pageParam));
      params.set("limit", String(MATCHES_PAGE_SIZE));
      params.set("tournament", "exclude");
      const r = await fetch(`/api/matches?${params}`);
      if (!r.ok) throw new Error("Failed to prefetch matches list");
      return r.json();
    },
    getNextPageParam: (last: ListPageResponse) =>
      last.hasMore ? last.nextOffset : undefined,
  });
}

export function prefetchPlayersListFirstPage(queryClient: QueryClient) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: ["players", "infinite", "rating", ""],
    initialPageParam: 0,
    staleTime: QUERY_STALE_TIME_MS,
    queryFn: async ({
      pageParam,
    }: {
      pageParam: number;
    }): Promise<ListPageResponse> => {
      const params = new URLSearchParams();
      params.set("offset", String(pageParam));
      params.set("limit", String(PLAYERS_PAGE_SIZE));
      params.set("sortBy", "rating");
      const r = await fetch(`/api/players?${params}`);
      if (!r.ok) throw new Error("Failed to prefetch players");
      return r.json();
    },
    getNextPageParam: (last: ListPageResponse) =>
      last.hasMore ? last.nextOffset : undefined,
  });
}
