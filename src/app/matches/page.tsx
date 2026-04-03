"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatchFiltersBar } from "@/components/MatchFiltersBar";
import { MatchListCards, type MatchListItem } from "@/components/MatchListCards";
import type { MatchFilterTab, MatchSourceTab } from "@/lib/matchFilters";

export default function MatchesPage() {
  const [filter, setFilter] = useState<MatchFilterTab>("all");
  const [source, setSource] = useState<MatchSourceTab>("regular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersMounted, setFiltersMounted] = useState(false);

  useEffect(() => {
    setFiltersMounted(true);
  }, []);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", filter, source],
    queryFn: () => {
      const params = new URLSearchParams();
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
      const qs = params.toString();
      const url = qs ? `/api/matches?${qs}` : "/api/matches";
      return fetch(url).then((r) => r.json());
    },
  });

  return (
    <div className="px-4 pt-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Matches</h1>

      <MatchFiltersBar
        filter={filter}
        source={source}
        onFilterChange={setFilter}
        onSourceChange={setSource}
        expanded={filtersOpen}
        onExpandedChange={setFiltersOpen}
        placeholder={!filtersMounted}
      />

      <MatchListCards
        matches={(matches ?? []) as MatchListItem[]}
        isLoading={isLoading}
      />
    </div>
  );
}
