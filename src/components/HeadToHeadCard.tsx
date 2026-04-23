"use client";

import Link from "next/link";
import { Swords } from "lucide-react";
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
}

export function HeadToHeadCard({ data, themName }: HeadToHeadCardProps) {
  const name = themName ?? "Player";
  const { meWins, themWins, total, streak, lastMatch } = data;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm ring-1 ring-white/[0.03]">
        <Header name={name} />
        <p className="mt-2 text-sm text-neutral">
          You haven&apos;t played a decided match against {name} yet.
        </p>
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
          <span className="text-xs font-medium text-primary">View →</span>
        </Link>
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
