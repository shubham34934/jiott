"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Filter,
  Flame,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
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
import { MatchCard } from "@/components/MatchCard";
import {
  MatchFiltersSheet,
  type MatchFiltersSheetValues,
} from "@/components/MatchFiltersSheet";
import type { PlayerOption } from "@/components/PlayerSearchInput";
import { TournamentListCard } from "@/components/TournamentListCard";
import { fetchPlayersForPicker } from "@/lib/fetchPlayersForPicker";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export type ProfileMatchParticipation = {
  team: "A" | "B";
  match: {
    id: string;
    type?: "SINGLES" | "DOUBLES";
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
  };
};

type TournamentRow = {
  id: string;
  tournament: {
    id: string;
    name: string;
    type: string;
    matchType: string;
    status: string;
    winnerTeamId: string | null;
    runnerUpTeamId: string | null;
  };
};

export type PlayerProfilePayload = {
  id: string;
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
  currentWinStreak?: number;
  bestWinStreak?: number;
  _rank?: number | null;
  user: { name: string | null; image: string | null };
  matchParticipations?: ProfileMatchParticipation[];
  tournamentTeams?: TournamentRow[];
};

export const PROFILE_FILTER_DEFAULTS: MatchFiltersSheetValues = {
  filter: "all",
  source: "all",
  format: "all",
  teamSlots: [null, null],
  opponentSlots: [null, null],
  outcome: "all",
};

export function matchOutcome(
  mp: ProfileMatchParticipation
): "won" | "lost" | "undecided" {
  if (mp.match.status !== "COMPLETED") return "undecided";
  let aWon = 0;
  let bWon = 0;
  for (const s of mp.match.sets) {
    if (s.teamAScore > s.teamBScore) aWon++;
    else if (s.teamBScore > s.teamAScore) bWon++;
  }
  if (aWon === bWon) return "undecided";
  const winningTeam: "A" | "B" = aWon > bWon ? "A" : "B";
  return mp.team === winningTeam ? "won" : "lost";
}

function passesFilters(
  mp: ProfileMatchParticipation,
  v: MatchFiltersSheetValues
): boolean {
  const m = mp.match;
  if (v.filter === "ONGOING" && m.status !== "ONGOING") return false;
  if (v.filter === "COMPLETED" && m.status !== "COMPLETED") return false;
  if (v.filter === "FRIENDLY" && !m.isFriendly) return false;
  if (v.source === "regular" && m.isTournamentMatch) return false;
  if (v.source === "tournament" && !m.isTournamentMatch) return false;
  if (v.format === "SINGLES" && m.type !== "SINGLES") return false;
  if (v.format === "DOUBLES" && m.type !== "DOUBLES") return false;

  const mySide = mp.team;
  const oppSide: "A" | "B" = mySide === "A" ? "B" : "A";
  for (const id of v.teamSlots) {
    if (!id) continue;
    const hit = m.participants.find((p) => p.player.id === id);
    if (!hit || hit.team !== mySide) return false;
  }
  for (const id of v.opponentSlots) {
    if (!id) continue;
    const hit = m.participants.find((p) => p.player.id === id);
    if (!hit || hit.team !== oppSide) return false;
  }

  if (v.outcome !== "all" && matchOutcome(mp) !== v.outcome) return false;
  return true;
}

function countActive(v: MatchFiltersSheetValues): number {
  return (
    (v.filter !== "all" ? 1 : 0) +
    (v.source !== "all" ? 1 : 0) +
    (v.format !== "all" ? 1 : 0) +
    (v.teamSlots.some((x) => x) ? 1 : 0) +
    (v.opponentSlots.some((x) => x) ? 1 : 0) +
    (v.outcome !== "all" ? 1 : 0)
  );
}

type RecentPreset = 7 | 14 | 30;
const RECENT_PRESETS: RecentPreset[] = [7, 14, 30];

function computeRecentStats(
  participations: ProfileMatchParticipation[],
  days: RecentPreset,
  now: Date = new Date()
): { total: number; wins: number; losses: number; winPct: number } {
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  let total = 0;
  let wins = 0;
  let losses = 0;
  for (const mp of participations) {
    if (new Date(mp.match.createdAt) < cutoff) continue;
    total++;
    const o = matchOutcome(mp);
    if (o === "won") wins++;
    else if (o === "lost") losses++;
  }
  const decided = wins + losses;
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : 0;
  return { total, wins, losses, winPct };
}

function placementLabel(
  teamId: string,
  t: TournamentRow["tournament"]
): string {
  if (t.status === "CREATED") return "Draft";
  if (t.status === "IN_PROGRESS") return "In progress";
  if (t.status === "COMPLETED") {
    if (t.winnerTeamId === teamId) return "Champion";
    if (t.runnerUpTeamId === teamId) return "Runner-up";
    return "Participant";
  }
  return "";
}

export interface PlayerProfileViewProps {
  player: PlayerProfilePayload;
  /** Optional content rendered between Recent activity and Tournaments (e.g., Challenge button). */
  actionSlot?: ReactNode;
}

export function PlayerProfileView({ player, actionSlot }: PlayerProfileViewProps) {
  const [filterValues, setFilterValues] = useState<MatchFiltersSheetValues>(
    PROFILE_FILTER_DEFAULTS
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recentPreset, setRecentPreset] = useState<RecentPreset>(7);

  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    presetRange("today")
  );
  const [customFrom, setCustomFrom] = useState<string>(() =>
    toDateInputValue(new Date())
  );
  const [customTo, setCustomTo] = useState<string>(() =>
    toDateInputValue(new Date())
  );

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

  const { data: playerOptions = [] } = useQuery<PlayerOption[]>({
    queryKey: ["players", "picker"],
    queryFn: () => fetchPlayersForPicker() as Promise<PlayerOption[]>,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const participations = player.matchParticipations ?? [];
  const tournamentRows = player.tournamentTeams ?? [];

  const winRate =
    player.matchesPlayed > 0
      ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
      : 0;

  return (
    <>
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-secondary to-primary p-6 text-white shadow-[0_12px_40px_-12px_rgba(94,158,255,0.45)] ring-1 ring-white/15">
        <div className="flex items-center gap-4">
          <Avatar
            name={player.user.name || ""}
            image={player.user.image}
            size="xl"
          />
          <div className="min-w-0">
            <span className="inline-block mb-1.5 text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">
              Rank #{player._rank ?? "—"}
            </span>
            <h2 className="text-xl font-bold truncate">{player.user.name}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        <StatTile
          icon={<Trophy size={20} className="text-primary mx-auto mb-2" />}
          value={player.rating}
          label="Rating"
        />
        <StatTile
          icon={<Target size={20} className="text-success mx-auto mb-2" />}
          value={player.matchesWon}
          label="Wins"
        />
        <StatTile
          icon={
            <TrendingUp size={20} className="text-secondary mx-auto mb-2" />
          }
          value={`${winRate}%`}
          label="Win Rate"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-3">
        <StatTile
          icon={<Swords size={20} className="text-primary mx-auto mb-2" />}
          value={player.matchesPlayed}
          label="Total matches"
        />
        <StatTile
          icon={<Flame size={20} className="text-warning mx-auto mb-2" />}
          value={player.currentWinStreak ?? 0}
          label="Current streak"
        />
        <StatTile
          icon={
            <Flame size={20} className="text-gold mx-auto mb-2 opacity-90" />
          }
          value={player.bestWinStreak ?? 0}
          label="Best streak"
        />
      </div>

      <RecentStatsSection
        participations={participations}
        preset={recentPreset}
        onPresetChange={setRecentPreset}
      />

      {actionSlot}

      {tournamentRows.length > 0 && (
        <div className="px-4 mt-6">
          <h3 className="mb-3 text-base font-bold text-text-primary">
            Tournaments
          </h3>
          <div className="flex flex-col gap-3 mb-2">
            {tournamentRows.map((row) => {
              const t = row.tournament;
              const formatLabel =
                t.type === "ROUND_ROBIN" ? "Round robin" : "Knockout";
              const placement = placementLabel(row.id, t);
              const meta = [formatLabel, t.matchType, placement || null]
                .filter(Boolean)
                .join(" · ");
              return (
                <TournamentListCard
                  key={row.id}
                  href={`/tournaments/${t.id}`}
                  title={t.name}
                  status={t.status}
                  meta={meta}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 mt-6 mb-4">
        <h3 className="mb-3 text-base font-bold text-text-primary">
          Match History
        </h3>
        <DateRangeFilter
          preset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetSelect={applyPreset}
          onCustomChange={applyCustom}
        />
        <MatchHistory
          participations={participations}
          filterValues={filterValues}
          dateRange={dateRange}
          onOpenSheet={() => setSheetOpen(true)}
        />
      </div>

      <MatchFiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={setFilterValues}
        value={filterValues}
        playerOptions={playerOptions}
        showOutcome={true}
        clearDefaults={{ source: "all" }}
      />
    </>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm ring-1 ring-white/[0.03]">
      {icon}
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-neutral">{label}</p>
    </div>
  );
}

function RecentStatsSection({
  participations,
  preset,
  onPresetChange,
}: {
  participations: ProfileMatchParticipation[];
  preset: RecentPreset;
  onPresetChange: (next: RecentPreset) => void;
}) {
  const stats = computeRecentStats(participations, preset);
  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-text-primary">
          Last {preset} days
        </h3>
        <div
          role="tablist"
          aria-label="Recent activity range"
          className="inline-flex gap-1 bg-surface border border-border rounded-full p-0.5"
        >
          {RECENT_PRESETS.map((d) => {
            const active = preset === d;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onPresetChange(d)}
                className={
                  active
                    ? "px-2.5 h-6 rounded-full bg-primary text-white text-[11px] font-semibold"
                    : "px-2.5 h-6 rounded-full text-[11px] font-medium text-neutral"
                }
              >
                {d}d
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<Activity size={20} className="text-primary mx-auto mb-2" />}
          value={stats.total}
          label="Total matches"
        />
        <StatTile
          icon={<TrendingUp size={20} className="text-success mx-auto mb-2" />}
          value={`${stats.winPct}%`}
          label="Win %"
        />
        <StatTile
          icon={
            <TrendingDown size={20} className="text-danger mx-auto mb-2" />
          }
          value={stats.losses}
          label="Lost matches"
        />
      </div>
    </section>
  );
}

function MatchHistory({
  participations,
  filterValues,
  dateRange,
  onOpenSheet,
}: {
  participations: ProfileMatchParticipation[];
  filterValues: MatchFiltersSheetValues;
  dateRange: DateRange;
  onOpenSheet: () => void;
}) {
  const fromMs = dateRange.from.getTime();
  const toMs = dateRange.to.getTime();
  const filtered = participations.filter((mp) => {
    const created = new Date(mp.match.createdAt).getTime();
    if (created < fromMs || created > toMs) return false;
    return passesFilters(mp, filterValues);
  });
  const activeCount = countActive(filterValues);
  return (
    <>
      <div className="flex items-center justify-between mb-3 min-h-9">
        <p className="text-sm text-neutral">
          {filtered.length.toLocaleString()}{" "}
          {filtered.length === 1 ? "match" : "matches"}
        </p>
        <button
          type="button"
          onClick={onOpenSheet}
          aria-label="Open filters"
          aria-haspopup="dialog"
          className="relative inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-surface text-xs font-semibold text-text-primary shadow-sm ring-1 ring-white/[0.03] hover:bg-surface-raised/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <Filter size={16} className="text-neutral" />
          Filters
          {activeCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {participations.length === 0 ? (
        <p className="text-sm text-neutral text-center py-4">No matches yet</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral text-center py-4">
          No matches match the current filters
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((mp) => (
            <MatchCard
              key={mp.match.id}
              id={mp.match.id}
              status={mp.match.status}
              isFriendly={mp.match.isFriendly}
              isTournamentMatch={mp.match.isTournamentMatch}
              tournamentName={mp.match.tournamentName}
              participants={mp.match.participants}
              sets={mp.match.sets}
              createdAt={mp.match.createdAt}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function PlayerProfileSkeleton() {
  const statCardCls =
    "rounded-xl border border-border bg-surface p-4 text-center shadow-sm ring-1 ring-white/[0.03] space-y-2";
  const chipCls = "h-5 bg-border rounded mx-auto animate-pulse";
  const skeletonTileRow = (widths: string[]) => (
    <div className="grid grid-cols-3 gap-3">
      {widths.map((w, i) => (
        <div key={`skel-tile-${i}-${w}`} className={statCardCls}>
          <div className="h-5 w-5 bg-border rounded mx-auto animate-pulse" />
          <div className={`${chipCls} w-10`} />
          <div className={`${chipCls} ${w}`} />
        </div>
      ))}
    </div>
  );
  return (
    <>
      <div className="mx-4 mt-4 rounded-2xl bg-surface border border-border p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-border" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-20 bg-border rounded-full" />
            <div className="h-6 w-40 bg-border rounded" />
          </div>
        </div>
      </div>
      <div className="px-4 mt-4">{skeletonTileRow(["w-10", "w-8", "w-14"])}</div>
      <div className="px-4 mt-3">{skeletonTileRow(["w-20", "w-20", "w-16"])}</div>
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-28 bg-border rounded animate-pulse" />
          <div className="h-6 w-28 bg-border rounded-full animate-pulse" />
        </div>
        {skeletonTileRow(["w-20", "w-12", "w-20"])}
      </div>
      <div className="px-4 mt-6 mb-4">
        <div className="h-5 w-32 bg-border rounded animate-pulse mb-3" />
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-surface border border-border animate-pulse" />
          <div className="h-24 rounded-xl bg-surface border border-border animate-pulse" />
          <div className="h-24 rounded-xl bg-surface border border-border animate-pulse" />
        </div>
      </div>
    </>
  );
}
