"use client";

import { useCallback, useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  DateRangeFilter,
  endOfDay,
  fromDateInputValue,
  presetRange,
  startOfDay,
  toDateInputValue,
  type DatePreset,
  type DateRange,
} from "@/components/DateRangeFilter";
import { Filter } from "lucide-react";
import {
  MatchFiltersSheet,
  type MatchFiltersSheetValues,
} from "@/components/MatchFiltersSheet";
import { InfiniteScrollSentinel } from "@/components/InfiniteScrollSentinel";
import { MatchListCards, type MatchListItem } from "@/components/MatchListCards";
import type { PlayerOption } from "@/components/PlayerSearchInput";
import type {
  MatchFilterTab,
  MatchFormatTab,
  MatchSourceTab,
} from "@/lib/matchFilters";
import { apiGet } from "@/lib/api-client";
import { fetchPlayersForPicker } from "@/lib/fetchPlayersForPicker";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

const MATCHES_PAGE_SIZE = 10;

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
  const [teamSlots, setTeamSlots] = useState<(string | null)[]>([null, null]);
  const [opponentSlots, setOpponentSlots] = useState<(string | null)[]>([
    null,
    null,
  ]);
  const [datePreset, setDatePreset] = useState<DatePreset>("7d");
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    presetRange("7d")
  );
  const [customFrom, setCustomFrom] = useState<string>(() =>
    toDateInputValue(presetRange("7d").from)
  );
  const [customTo, setCustomTo] = useState<string>(() =>
    toDateInputValue(presetRange("7d").to)
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersMounted, setFiltersMounted] = useState(false);

  // Defer filter chrome until client mount so SSR markup matches first paint.
  useEffect(() => {
    queueMicrotask(() => setFiltersMounted(true));
  }, []);

  const activeFilterCount =
    (filter !== "all" ? 1 : 0) +
    (source !== "regular" ? 1 : 0) +
    (format !== "all" ? 1 : 0) +
    (teamSlots.some((x) => x) ? 1 : 0) +
    (opponentSlots.some((x) => x) ? 1 : 0);

  const applyFilters = (v: MatchFiltersSheetValues) => {
    setFilter(v.filter);
    setSource(v.source);
    setFormat(v.format);
    setTeamSlots(v.teamSlots);
    setOpponentSlots(v.opponentSlots);
  };

  const { data: teamPlayerOptions = [] } = useQuery<PlayerOption[]>({
    queryKey: ["players", "picker"],
    queryFn: () => fetchPlayersForPicker() as Promise<PlayerOption[]>,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const teamKey = teamSlots.filter((x): x is string => !!x).join(",");
  const oppKey = opponentSlots.filter((x): x is string => !!x).join(",");
  const fromMs = dateRange.from.getTime();
  const toMs = dateRange.to.getTime();

  const applyPreset = (p: Exclude<DatePreset, "custom">) => {
    const r = presetRange(p);
    setDatePreset(p);
    setDateRange(r);
    setCustomFrom(toDateInputValue(r.from));
    setCustomTo(toDateInputValue(r.to));
  };

  const applyCustom = (from: string, to: string) => {
    setDatePreset("custom");
    setCustomFrom(from);
    setCustomTo(to);
    const f = fromDateInputValue(from);
    const t = fromDateInputValue(to);
    if (f && t) {
      setDateRange({ from: startOfDay(f), to: endOfDay(t) });
    }
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "matches",
      "infinite",
      filter,
      source,
      format,
      teamKey,
      oppKey,
      fromMs,
      toMs,
    ],
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
      if (teamKey) params.set("team", teamKey);
      if (oppKey) params.set("opponent", oppKey);
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
      const qs = params.toString();
      const url = `/api/matches?${qs}`;
      const r = await apiGet(url);
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
      <h1 className="text-2xl font-bold text-text-primary mb-4">Matches</h1>

      <DateRangeFilter
        preset={datePreset}
        customFrom={customFrom}
        customTo={customTo}
        onPresetSelect={applyPreset}
        onCustomChange={applyCustom}
      />

      <div className="flex items-center justify-between mb-3 min-h-9">
        <p className="text-sm text-neutral">
          {!isLoading && typeof totalCount === "number"
            ? `${totalCount.toLocaleString()} ${totalCount === 1 ? "match" : "matches"}`
            : ""}
        </p>
        {filtersMounted && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open filters"
            aria-haspopup="dialog"
            className="relative inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-surface text-xs font-semibold text-text-primary shadow-sm ring-1 ring-white/[0.03] hover:bg-surface-raised/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <Filter size={16} className="text-neutral" />
            Filters
            {activeFilterCount > 0 && (
              <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      <MatchFiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={applyFilters}
        value={{
          filter,
          source,
          format,
          teamSlots,
          opponentSlots,
          outcome: "all",
        }}
        playerOptions={teamPlayerOptions}
        showOutcome={false}
        clearDefaults={{ source: "regular" }}
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
