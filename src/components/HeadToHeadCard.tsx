"use client";

import Link from "next/link";
import { ChevronRight, Swords } from "lucide-react";
import { formatDisplayDate } from "@/lib/formatDisplayDate";

export type HeadToHeadData = {
  meWins: number;
  themWins: number;
  total: number;
  streak: { side: "me" | "them" | null; count: number };
  lastMatch: {
    id: string;
    createdAt: string;
    meWon: boolean;
    meSetsWon: number;
    themSetsWon: number;
    isFriendly: boolean;
    type: "SINGLES" | "DOUBLES";
  } | null;
};

export interface HeadToHeadCardProps {
  data: HeadToHeadData;
  themName: string | null;
  /** When both provided, the card shows a "See all matches" link filtered to this pair. */
  meId?: string | null;
  themId?: string | null;
}

export function HeadToHeadCard({
  data,
  themName,
  meId,
  themId,
}: HeadToHeadCardProps) {
  const name = themName ?? "Player";
  const { meWins, themWins, total, streak, lastMatch } = data;
  const allMatchesHref =
    meId && themId
      ? `/matches?team=${encodeURIComponent(meId)}&opponent=${encodeURIComponent(themId)}`
      : null;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-neutral shadow-sm ring-1 ring-white/[0.03]">
        <Swords size={12} className="shrink-0 text-neutral" />
        <span className="truncate">
          You haven&apos;t played {name} yet.
        </span>
      </div>
    );
  }

  const streakLabel = streakDescription(streak, name);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm ring-1 ring-white/[0.03]">
      <Header name={name} />

      <div className="mt-3 grid grid-cols-3 items-center gap-2">
        <SideTally
          label="You"
          wins={meWins}
          emphasize={meWins > themWins}
          color="text-success"
        />
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-neutral">
          {total} match{total === 1 ? "" : "es"}
        </p>
        <SideTally
          label={name}
          wins={themWins}
          emphasize={themWins > meWins}
          color="text-danger"
          align="right"
        />
      </div>

      {streakLabel && (
        <p className="mt-3 text-xs text-neutral">{streakLabel}</p>
      )}

      {lastMatch && (
        <Link
          href={`/matches/${lastMatch.id}`}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/35 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-xs text-neutral truncate">
              Last · {formatDisplayDate(lastMatch.createdAt)}
              {lastMatch.isFriendly ? " · Friendly" : ""}
            </p>
            <p
              className={`text-sm font-semibold ${
                lastMatch.meWon ? "text-success" : "text-danger"
              }`}
            >
              {lastMatch.meWon ? "You won" : "You lost"}{" "}
              {lastMatch.meSetsWon}-{lastMatch.themSetsWon}
            </p>
          </div>
          <span className="text-xs font-medium text-primary">Open match →</span>
        </Link>
      )}

      {allMatchesHref && total > 0 && (
        <Link
          href={allMatchesHref}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-primary hover:bg-primary/15 transition-colors"
        >
          <span className="text-sm font-semibold">
            See all {total} match{total === 1 ? "" : "es"}
          </span>
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

export interface HeadToHeadBannerProps {
  data: HeadToHeadData;
  meName: string | null;
  themName: string | null;
  /** Called when the user taps the "clear" affordance (e.g., to reset the filter). */
  onClear?: () => void;
}

/**
 * Compact horizontal summary for the matches list. Lives in a very different
 * visual register than the profile-page card so they don't look duplicated.
 */
export function HeadToHeadBanner({
  data,
  meName,
  themName,
  onClear,
}: HeadToHeadBannerProps) {
  const me = meName ?? "You";
  const them = themName ?? "Opponent";
  const { meWins, themWins, total } = data;
  const decided = meWins + themWins;
  const winPct = decided > 0 ? Math.round((meWins / decided) * 100) : 0;
  const lead =
    meWins > themWins ? "you" : themWins > meWins ? "them" : "even";

  return (
    <div className="flex items-center gap-3 mb-3 rounded-full border border-border bg-surface py-2 pl-3 pr-2 shadow-sm ring-1 ring-white/[0.03]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Swords size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">
          {me}{" "}
          <span
            className={`tabular-nums ${
              lead === "you" ? "text-success" : ""
            }`}
          >
            {meWins}
          </span>
          <span className="text-neutral"> – </span>
          <span
            className={`tabular-nums ${
              lead === "them" ? "text-danger" : ""
            }`}
          >
            {themWins}
          </span>{" "}
          {them}
        </p>
        <p className="text-[10px] text-neutral truncate">
          {total} match{total === 1 ? "" : "es"} · {winPct}% win rate
        </p>
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-[11px] font-semibold text-primary px-2 py-1 rounded-full hover:bg-primary/10"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function Header({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Swords size={16} />
      </div>
      <p className="text-sm font-bold text-text-primary">
        Head-to-head vs {name}
      </p>
    </div>
  );
}

function SideTally({
  label,
  wins,
  emphasize,
  color,
  align = "left",
}: {
  label: string;
  wins: number;
  emphasize: boolean;
  color: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral truncate">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tabular-nums ${
          emphasize ? color : "text-text-primary"
        }`}
      >
        {wins}
      </p>
    </div>
  );
}

function streakDescription(
  streak: HeadToHeadData["streak"],
  themName: string
): string | null {
  if (!streak.side || streak.count <= 0) return null;
  const who = streak.side === "me" ? "You" : themName;
  if (streak.count === 1) return `${who} won the last meeting.`;
  return `${who} lead ${streak.count} in a row.`;
}
