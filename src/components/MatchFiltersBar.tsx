"use client";

import { ChevronDown, Filter } from "lucide-react";
import {
  type MatchFilterTab,
  type MatchFormatTab,
  type MatchSourceTab,
} from "@/lib/matchFilters";

const FILTER_TABS: { key: MatchFilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "AWAITING_ACCEPTANCE", label: "Pending accept" },
  { key: "ONGOING", label: "Ongoing" },
  { key: "AWAITING_CONFIRMATION", label: "Pending confirm" },
  { key: "COMPLETED", label: "Completed" },
  { key: "FRIENDLY", label: "Friendly" },
];

const SOURCE_TABS: { key: MatchSourceTab; label: string; hint: string }[] = [
  { key: "regular", label: "Regular", hint: "Exclude tournaments" },
  { key: "tournament", label: "Tournament", hint: "Tournament only" },
  { key: "all", label: "All sources", hint: "Include everything" },
];

const FORMAT_TABS: { key: MatchFormatTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "SINGLES", label: "Singles" },
  { key: "DOUBLES", label: "Doubles" },
];

export interface MatchFiltersBarProps {
  filter: MatchFilterTab;
  source: MatchSourceTab;
  format: MatchFormatTab;
  onFilterChange: (next: MatchFilterTab) => void;
  onSourceChange: (next: MatchSourceTab) => void;
  onFormatChange: (next: MatchFormatTab) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /** When true, render a skeleton bar (matches list avoids SSR/client mismatch). */
  placeholder?: boolean;
}

export function MatchFiltersBar({
  filter,
  source,
  format,
  onFilterChange,
  onSourceChange,
  onFormatChange,
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
  const formatSummary =
    FORMAT_TABS.find((t) => t.key === format)?.label ?? format;

  return (
    <div className="mb-6">
      <button
        type="button"
        id="match-filters-trigger"
        aria-expanded={expanded}
        aria-controls="match-filters-panel"
        onClick={() => onExpandedChange(!expanded)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm ring-1 ring-white/[0.03] transition-colors hover:bg-surface-raised/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        <Filter className="h-5 w-5 shrink-0 text-neutral" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-text-primary">
            Filters
          </span>
          <p className="text-xs text-neutral truncate mt-0.5">
            {sourceSummary} · {formatSummary} · {statusSummary}
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
          className="mt-3 space-y-4 rounded-xl border border-border bg-surface-raised/90 p-4 ring-1 ring-white/[0.03]"
        >
          <section aria-labelledby="filter-heading-source">
            <p
              id="filter-heading-source"
              className="text-xs text-neutral mb-2 font-medium uppercase tracking-wide"
            >
              Source
            </p>
            <div className="flex rounded-xl border border-border bg-background p-1">
              {SOURCE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  title={tab.hint}
                  onClick={() => onSourceChange(tab.key)}
                  className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    source === tab.key
                      ? "bg-surface-raised text-text-primary shadow-sm ring-1 ring-white/[0.06]"
                      : "text-neutral"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="filter-heading-format">
            <p
              id="filter-heading-format"
              className="text-xs text-neutral mb-2 font-medium uppercase tracking-wide"
            >
              Format
            </p>
            <div className="flex rounded-xl border border-border bg-background p-1">
              {FORMAT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFormatChange(tab.key)}
                  className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    format === tab.key
                      ? "bg-surface-raised text-text-primary shadow-sm ring-1 ring-white/[0.06]"
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
            <div className="flex rounded-xl border border-border bg-background p-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterChange(tab.key)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    filter === tab.key
                      ? "bg-surface-raised text-text-primary shadow-sm ring-1 ring-white/[0.06]"
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
