"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Filter } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";

type FilterTab = "all" | "ONGOING" | "COMPLETED" | "FRIENDLY";

/** Default: hide tournament bracket matches; show only standalone / casual. */
type SourceTab = "regular" | "tournament" | "all";

export default function MatchesPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [source, setSource] = useState<SourceTab>("regular");
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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "ONGOING", label: "Ongoing" },
    { key: "COMPLETED", label: "Completed" },
    { key: "FRIENDLY", label: "Friendly" },
  ];

  const sourceTabs: { key: SourceTab; label: string; hint: string }[] = [
    { key: "regular", label: "Regular", hint: "Exclude tournaments" },
    { key: "tournament", label: "Tournament", hint: "Tournament only" },
    { key: "all", label: "All sources", hint: "Include everything" },
  ];

  const sourceSummary =
    sourceTabs.find((t) => t.key === source)?.label ?? source;
  const statusSummary = tabs.find((t) => t.key === filter)?.label ?? filter;

  return (
    <div className="px-4 pt-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Matches</h1>

      {!filtersMounted ? (
        <div className="mb-6" aria-hidden>
          <div className="h-12 rounded-xl bg-surface border border-border animate-pulse" />
        </div>
      ) : (
        <div className="mb-6">
          <button
            type="button"
            id="match-filters-trigger"
            aria-expanded={filtersOpen}
            aria-controls="match-filters-panel"
            onClick={() => setFiltersOpen((o) => !o)}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-background/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20"
          >
            <Filter className="h-5 w-5 shrink-0 text-neutral" aria-hidden />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-text-primary">
                Filters
              </span>
              <p className="text-xs text-neutral truncate mt-0.5">
                {sourceSummary} · {statusSummary}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-neutral transition-transform ${
                filtersOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          {filtersOpen && (
            <div
              id="match-filters-panel"
              role="region"
              aria-label="Match filters"
              className="mt-3 space-y-4 rounded-xl border border-border bg-surface/50 p-4"
            >
              {/* Add more filter sections below as needed (e.g. date range, player). */}
              <section aria-labelledby="filter-heading-source">
                <p
                  id="filter-heading-source"
                  className="text-xs text-neutral mb-2 font-medium uppercase tracking-wide"
                >
                  Source
                </p>
                <div className="flex rounded-xl bg-background border border-border p-1">
                  {sourceTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      title={tab.hint}
                      onClick={() => setSource(tab.key)}
                      className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                        source === tab.key
                          ? "bg-surface text-text-primary shadow-sm"
                          : "text-neutral"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </section>

              <section aria-labelledby="filter-heading-status">
                <p
                  id="filter-heading-status"
                  className="text-xs text-neutral mb-2 font-medium uppercase tracking-wide"
                >
                  Status
                </p>
                <div className="flex rounded-xl bg-background border border-border p-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        filter === tab.key
                          ? "bg-surface text-text-primary shadow-sm"
                          : "text-neutral"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-neutral text-sm">
            Loading matches...
          </div>
        )}
        {matches?.length === 0 && !isLoading && (
          <p className="text-sm text-neutral text-center py-12">
            No matches found.
          </p>
        )}
        {matches?.map(
          (match: {
            id: string;
            status: "ONGOING" | "COMPLETED" | "DISPUTED";
            isFriendly?: boolean;
            isTournamentMatch?: boolean;
            tournamentName?: string | null;
            participants: Array<{
              team: "A" | "B";
              player: {
                id: string;
                user: { name: string | null; image: string | null };
              };
            }>;
            sets: Array<{ teamAScore: number; teamBScore: number }>;
            createdAt: string;
          }) => (
            <MatchCard
              key={match.id}
              id={match.id}
              status={match.status}
              isFriendly={match.isFriendly}
              isTournamentMatch={match.isTournamentMatch}
              tournamentName={match.tournamentName}
              participants={match.participants}
              sets={match.sets}
              createdAt={match.createdAt}
            />
          )
        )}
      </div>
    </div>
  );
}
