"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import {
  PlayerSearchInput,
  type PlayerOption,
} from "@/components/PlayerSearchInput";
import type {
  MatchFilterTab,
  MatchFormatTab,
  MatchSourceTab,
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

const FORMAT_TABS: { key: MatchFormatTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "SINGLES", label: "Singles" },
  { key: "DOUBLES", label: "Doubles" },
];

export type OutcomeFilter = "all" | "won" | "lost";

const OUTCOME_TABS: { key: OutcomeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

type MaybeId = string | null;

export interface MatchFiltersSheetValues {
  filter: MatchFilterTab;
  source: MatchSourceTab;
  format: MatchFormatTab;
  teamSlots: MaybeId[];
  opponentSlots: MaybeId[];
  outcome: OutcomeFilter;
}

export interface MatchFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (next: MatchFiltersSheetValues) => void;
  value: MatchFiltersSheetValues;
  playerOptions: PlayerOption[];
  /** Show the Win/Lost section. Default: true. */
  showOutcome?: boolean;
  /** Defaults for "Clear all". Falls back to built-in defaults. */
  clearDefaults?: Partial<MatchFiltersSheetValues>;
}

const BUILTIN_DEFAULTS: MatchFiltersSheetValues = {
  filter: "all",
  source: "regular",
  format: "all",
  teamSlots: [null, null],
  opponentSlots: [null, null],
  outcome: "all",
};

export function MatchFiltersSheet({
  open,
  onClose,
  onApply,
  value,
  playerOptions,
  showOutcome = true,
  clearDefaults,
}: MatchFiltersSheetProps) {
  const [draft, setDraft] = useState<MatchFiltersSheetValues>(value);

  // Reset draft whenever the sheet is opened with the current committed values.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const allSelectedIds = [...draft.teamSlots, ...draft.opponentSlots].filter(
    (x): x is string => !!x
  );

  const setTeamSlot = (i: number, v: MaybeId) => {
    const next = [...draft.teamSlots];
    next[i] = v;
    setDraft({ ...draft, teamSlots: next });
  };
  const setOpponentSlot = (i: number, v: MaybeId) => {
    const next = [...draft.opponentSlots];
    next[i] = v;
    setDraft({ ...draft, opponentSlots: next });
  };

  const clearAll = () =>
    setDraft({ ...BUILTIN_DEFAULTS, ...clearDefaults });
  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Dismiss filters"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Match filters"
        className="relative z-10 w-full max-w-lg rounded-t-2xl border-t border-border-strong bg-surface-raised shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] flex flex-col max-h-[88dvh]"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-base font-bold text-text-primary">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-1 text-neutral hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Section heading="Source">
            <Segmented
              options={SOURCE_TABS}
              value={draft.source}
              onChange={(v) => setDraft({ ...draft, source: v })}
            />
          </Section>

          <Section heading="Format">
            <Segmented
              options={FORMAT_TABS}
              value={draft.format}
              onChange={(v) => setDraft({ ...draft, format: v })}
            />
          </Section>

          <Section heading="Status">
            <Segmented
              options={FILTER_TABS}
              value={draft.filter}
              onChange={(v) => setDraft({ ...draft, filter: v })}
            />
          </Section>

          {showOutcome && (
            <Section heading="Outcome">
              <Segmented
                options={OUTCOME_TABS}
                value={draft.outcome}
                onChange={(v) => setDraft({ ...draft, outcome: v })}
              />
            </Section>
          )}

          <Section heading="Players">
            <SlotRow
              label="Team"
              slots={draft.teamSlots}
              onChange={setTeamSlot}
              players={playerOptions}
              excludeIds={allSelectedIds}
            />
            <div className="h-3" />
            <SlotRow
              label="Opponent"
              slots={draft.opponentSlots}
              onChange={setOpponentSlot}
              players={playerOptions}
              excludeIds={allSelectedIds}
            />
            <p className="text-[11px] text-neutral mt-3">
              Singles: fill one slot per row. Doubles: fill both. Leave empty
              slots to match any player.
            </p>
          </Section>
        </div>

        <div
          className="border-t border-border px-5 py-3 flex items-center gap-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-neutral hover:text-text-primary"
          >
            Clear all
          </button>
          <div className="flex-1" />
          <Button onClick={handleApply} size="md">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs text-neutral mb-2 font-medium uppercase tracking-wide">
        {heading}
      </p>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; hint?: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex rounded-xl border border-border bg-background p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          title={opt.hint}
          onClick={() => onChange(opt.key)}
          className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            value === opt.key
              ? "bg-surface-raised text-text-primary shadow-sm ring-1 ring-white/[0.06]"
              : "text-neutral"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SlotRow({
  label,
  slots,
  onChange,
  players,
  excludeIds,
}: {
  label: string;
  slots: MaybeId[];
  onChange: (i: number, v: MaybeId) => void;
  players: PlayerOption[];
  excludeIds: string[];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral mb-2">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <PlayerSearchInput
            key={i}
            label={`Player ${i + 1}`}
            players={players}
            excludeIds={excludeIds.filter((id) => id !== slots[i])}
            selectedId={slots[i] ?? null}
            onSelect={(id) => onChange(i, id)}
            onClear={() => onChange(i, null)}
          />
        ))}
      </div>
    </div>
  );
}
