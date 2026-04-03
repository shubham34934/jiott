"use client";

import { useCallback, useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { InfiniteScrollSentinel } from "@/components/InfiniteScrollSentinel";
import { PlayerCard } from "@/components/PlayerCard";

type PlayerSort = "rating" | "matchesPlayed" | "matchesWon";

const SORT_OPTIONS: { key: PlayerSort; label: string }[] = [
  { key: "rating", label: "Rating" },
  { key: "matchesPlayed", label: "Matches played" },
  { key: "matchesWon", label: "Wins" },
];

const PLAYERS_PAGE_SIZE = 20;

type PlayerRow = {
  id: string;
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
  user: { name: string | null };
};

type PlayersApiResponse = {
  items: PlayerRow[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
};

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<PlayerSort>("rating");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["players", "infinite", sortBy, debouncedSearch],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PlayersApiResponse> => {
      const params = new URLSearchParams();
      params.set("offset", String(pageParam));
      params.set("limit", String(PLAYERS_PAGE_SIZE));
      params.set("sortBy", sortBy);
      if (debouncedSearch.length > 0) {
        params.set("q", debouncedSearch);
      }
      const r = await fetch(`/api/players?${params}`);
      return r.json();
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
  });

  const players = data?.pages.flatMap((p) => p.items) ?? [];
  const totalCount = data?.pages[0]?.total;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="px-4 pt-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">Players</h1>
        {!isLoading && typeof totalCount === "number" && (
          <p className="text-sm text-neutral mt-1">
            {totalCount.toLocaleString()}{" "}
            {totalCount === 1 ? "player" : "players"}
          </p>
        )}
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral"
        />
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-surface border border-border rounded-xl text-sm placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDownWideNarrow
            size={16}
            className="text-neutral shrink-0"
            aria-hidden
          />
          <span className="text-xs font-semibold text-text-primary">
            Sort by
          </span>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Sort players"
        >
          {SORT_OPTIONS.map(({ key, label }) => {
            const selected = sortBy === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
                  selected
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-primary border-border hover:bg-background"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-neutral text-sm">
            Loading players...
          </div>
        )}
        {players.length === 0 && !isLoading && (
          <p className="text-sm text-neutral text-center py-12">
            No players found.
          </p>
        )}
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            id={player.id}
            name={player.user.name || "Unknown"}
            rating={player.rating}
            matchesPlayed={player.matchesPlayed}
            matchesWon={player.matchesWon}
          />
        ))}

        {!isLoading && hasNextPage && (
          <>
            <InfiniteScrollSentinel
              key={data?.pages.length ?? 0}
              enabled={hasNextPage && !isFetchingNextPage}
              onIntersect={loadMore}
            />
            {isFetchingNextPage && (
              <p className="text-center py-6 text-sm text-neutral">
                Loading more…
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
