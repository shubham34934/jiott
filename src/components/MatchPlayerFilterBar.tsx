"use client";

import { ChevronDown, Users } from "lucide-react";
import {
  PlayerSearchInput,
  type PlayerOption,
} from "@/components/PlayerSearchInput";

type MaybeId = string | null;

export interface MatchPlayerFilterBarProps {
  teamSlots: MaybeId[];
  opponentSlots: MaybeId[];
  onTeamSlotsChange: (next: MaybeId[]) => void;
  onOpponentSlotsChange: (next: MaybeId[]) => void;
  playerOptions: PlayerOption[];
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /** When true, render a skeleton bar (avoids SSR/client mismatch). */
  placeholder?: boolean;
}

export function MatchPlayerFilterBar({
  teamSlots,
  opponentSlots,
  onTeamSlotsChange,
  onOpponentSlotsChange,
  playerOptions,
  expanded,
  onExpandedChange,
  placeholder,
}: MatchPlayerFilterBarProps) {
  if (placeholder) {
    return (
      <div className="mb-6" aria-hidden>
        <div className="h-12 rounded-xl bg-surface border border-border animate-pulse" />
      </div>
    );
  }

  const nameById = (id: string) =>
    playerOptions.find((p) => p.id === id)?.user.name ?? "Player";
  const slotsToNames = (slots: MaybeId[]) =>
    slots.filter((x): x is string => !!x).map(nameById).join(" & ");

  const teamNames = slotsToNames(teamSlots);
  const oppNames = slotsToNames(opponentSlots);
  const summary =
    !teamNames && !oppNames
      ? "Any players"
      : teamNames && oppNames
        ? `${teamNames} vs ${oppNames}`
        : teamNames || oppNames;

  const allSelectedIds = [...teamSlots, ...opponentSlots].filter(
    (x): x is string => !!x
  );
  const hasAny = allSelectedIds.length > 0;

  const clearAll = () => {
    onTeamSlotsChange([null, null]);
    onOpponentSlotsChange([null, null]);
  };

  return (
    <div className="mb-6">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="player-filter-panel"
        onClick={() => onExpandedChange(!expanded)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm ring-1 ring-white/[0.03] transition-colors hover:bg-surface-raised/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        <Users className="h-5 w-5 shrink-0 text-neutral" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-text-primary">
            Players
          </span>
          <p className="text-xs text-neutral truncate mt-0.5">{summary}</p>
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
          id="player-filter-panel"
          role="region"
          aria-label="Player filter"
          className="mt-3 rounded-xl border border-border bg-surface-raised/90 p-4 ring-1 ring-white/[0.03]"
        >
          {hasAny && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-primary font-medium"
              >
                Clear
              </button>
            </div>
          )}

          <SlotRow
            label="Team"
            slots={teamSlots}
            onChange={onTeamSlotsChange}
            players={playerOptions}
            excludeIds={allSelectedIds}
          />
          <div className="h-3" />
          <SlotRow
            label="Opponent"
            slots={opponentSlots}
            onChange={onOpponentSlotsChange}
            players={playerOptions}
            excludeIds={allSelectedIds}
          />

          <p className="text-[11px] text-neutral mt-3">
            Singles: fill one slot per row. Doubles: fill both. Leave empty
            slots to match any player.
          </p>
        </div>
      )}
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
  onChange: (next: MaybeId[]) => void;
  players: PlayerOption[];
  excludeIds: string[];
}) {
  const setSlot = (i: number, v: MaybeId) => {
    const next = [...slots];
    next[i] = v;
    onChange(next);
  };
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
            onSelect={(id) => setSlot(i, id)}
            onClear={() => setSlot(i, null)}
          />
        ))}
      </div>
    </div>
  );
}
