"use client";

import { useCallback, useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { InfiniteScrollSentinel } from "@/components/InfiniteScrollSentinel";
import { MatchFiltersBar } from "@/components/MatchFiltersBar";
import { MatchListCards, type MatchListItem } from "@/components/MatchListCards";
import type {
  MatchFilterTab,
  MatchFormatTab,
  MatchSourceTab,
} from "@/lib/matchFilters";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

const MATCHES_PAGE_SIZE = 20;

type MatchesApiResponse = {
  items: MatchListItem[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
};

export default function MatchesPage() {
  const [filter, setFilter] = useState<MatchFilterTab>("all");
  const [source, setSource] = useState<MatchSourceTab>("regular");
  const [format, setFormat] = useState<MatchFormatTab>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersMounted, setFiltersMounted] = useState(false);

  // Defer filter chrome until client mount so SSR markup matches first paint.
  useEffect(() => {
    queueMicrotask(() => setFiltersMounted(true));
  }, []);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["matches", "infinite", filter, source, format],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<MatchesApiResponse> => {
      const params = new URLSearchParams();
      params.set("offset", String(pageParam));
      params.set("limit", String(MATCHES_PAGE_SIZE));
      if (filter === "ONGOING" || filter === "COMPLETED") {
        params.set("status", filter);
      } else if (filter === "FRIENDLY") {
        params.set("friendly", "true");
      }
      if (source === "regular") {
        params.set("tournament", "exclude");
      } else if (source === "tournament") {
        params.set("tournament", "only");
      }
      if (format === "SINGLES" || format === "DOUBLES") {
        params.set("type", format);
      }
      const qs = params.toString();
      const url = `/api/matches?${qs}`;
      const r = await fetch(url);
      return r.json();
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
    staleTime: QUERY_STALE_TIME_MS,
  });

  const matches = data?.pages.flatMap((p) => p.items) ?? [];
  const totalCount = data?.pages[0]?.total;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="px-4 pt-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">Matches</h1>
        {!isLoading && typeof totalCount === "number" && (
          <p className="text-sm text-neutral mt-1">
            {totalCount.toLocaleString()}{" "}
            {totalCount === 1 ? "match" : "matches"}
          </p>
        )}
      </div>

      <MatchFiltersBar
        filter={filter}
        source={source}
        format={format}
        onFilterChange={setFilter}
        onSourceChange={setSource}
        onFormatChange={setFormat}
        expanded={filtersOpen}
        onExpandedChange={setFiltersOpen}
        placeholder={!filtersMounted}
      />

      <MatchListCards matches={matches} isLoading={isLoading} />

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
  );
}
