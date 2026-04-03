"use client";

import { ChevronDown, Filter } from "lucide-react";
import {
  type MatchFilterTab,
  type MatchSourceTab,
} from "@/lib/matchFilters";

const FILTER_TABS: { key: MatchFilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ONGOING", label: "Ongoing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "FRIENDLY", label: "Friendly" },
];

const SOURCE_TABS: { key: MatchSourceTab; label: string; hint: string }[] = [
  { key: "regular", label: "Regular", hint: "Exclude tournaments" },
  { key: "tournament", label: "Tournament", hint: "Tournament only" },
  { key: "all", label: "All sources", hint: "Include everything" },
];

export interface MatchFiltersBarProps {
  filter: MatchFilterTab;
  source: MatchSourceTab;
  onFilterChange: (next: MatchFilterTab) => void;
  onSourceChange: (next: MatchSourceTab) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /** When true, render a skeleton bar (matches list avoids SSR/client mismatch). */
  placeholder?: boolean;
}

export function MatchFiltersBar({
  filter,
  source,
  onFilterChange,
  onSourceChange,
  expanded,
  onExpandedChange,
  placeholder,
}: MatchFiltersBarProps) {
  if (placeholder) {
    return (
      <div className="mb-6" aria-hidden>
        <div className="h-12 rounded-xl bg-surface border border-border animate-pulse" />
      </div>
    );
  }

  const sourceSummary =
    SOURCE_TABS.find((t) => t.key === source)?.label ?? source;
  const statusSummary =
    FILTER_TABS.find((t) => t.key === filter)?.label ?? filter;

  return (
    <div className="mb-6">
      <button
        type="button"
        id="match-filters-trigger"
        aria-expanded={expanded}
        aria-controls="match-filters-panel"
        onClick={() => onExpandedChange(!expanded)}
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
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div
          id="match-filters-panel"
          role="region"
          aria-label="Match filters"
          className="mt-3 space-y-4 rounded-xl border border-border bg-surface/50 p-4"
        >
          <section aria-labelledby="filter-heading-source">
            <p
              id="filter-heading-source"
              className="text-xs text-neutral mb-2 font-medium uppercase tracking-wide"
            >
              Source
            </p>
            <div className="flex rounded-xl bg-background border border-border p-1">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  title={tab.hint}
                  onClick={() => onSourceChange(tab.key)}
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
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterChange(tab.key)}
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
  );
}
