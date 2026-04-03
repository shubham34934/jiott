"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Trophy } from "lucide-react";

interface Player {
  id: string;
  user: { name: string | null; image: string | null };
}

interface Participant {
  team: "A" | "B";
  player: Player;
}

interface SetData {
  teamAScore: number;
  teamBScore: number;
}

interface MatchCardProps {
  id: string;
  status: "ONGOING" | "COMPLETED" | "DISPUTED";
  participants: Participant[];
  sets: SetData[];
  createdAt: string;
  isFriendly?: boolean;
  isTournamentMatch?: boolean;
  /** Set when the match is linked to a tournament bracket */
  tournamentName?: string | null;
  linkPrefix?: string;
}

export function MatchCard({
  id,
  status,
  participants,
  sets,
  createdAt,
  isFriendly = false,
  isTournamentMatch = false,
  tournamentName = null,
  linkPrefix = "/matches",
}: MatchCardProps) {
  const teamA = participants.filter((p) => p.team === "A");
  const teamB = participants.filter((p) => p.team === "B");

  let teamASetsWon = 0;
  let teamBSetsWon = 0;
  for (const set of sets) {
    if (set.teamAScore > set.teamBScore) teamASetsWon++;
    else if (set.teamBScore > set.teamAScore) teamBSetsWon++;
  }

  const teamAWon = status === "COMPLETED" && teamASetsWon > teamBSetsWon;
  const teamBWon = status === "COMPLETED" && teamBSetsWon > teamASetsWon;

  const teamANames = teamA
    .map((p) => p.player.user.name || "Unknown")
    .join(" & ");
  const teamBNames = teamB
    .map((p) => p.player.user.name || "Unknown")
    .join(" & ");

  const date = new Date(createdAt).toISOString().split("T")[0];

  return (
    <Link href={`${linkPrefix}/${id}`} className="block">
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {status === "COMPLETED" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral bg-background rounded-full px-2.5 py-1">
                <CheckCircle2 size={14} className="text-success" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-success rounded-full px-2.5 py-1">
                <Clock size={14} />
                Ongoing
              </span>
            )}
            {isFriendly && (
              <span className="inline-flex items-center text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
                Friendly
              </span>
            )}
          </div>
          <span className="text-xs text-neutral">{date}</span>
        </div>

        {isTournamentMatch && tournamentName && (
          <div className="mb-3">
            <span className="inline-flex max-w-full items-center text-xs font-medium text-amber-800 bg-amber-50 rounded-full px-2.5 py-1 truncate">
              Tournament: <b className="font-bold">{tournamentName}</b>
            </span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className={`text-sm flex items-center gap-1.5 ${
                teamAWon
                  ? "font-bold text-green-500"
                  : "text-text-primary"
              }`}
            >
              {teamANames}
              {teamAWon && <Trophy size={14} className="text-black shrink-0" />}
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${
                teamAWon ? "text-green-500" : "text-neutral"
              }`}
            >
              {teamASetsWon}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-sm flex items-center gap-1.5 ${
                teamBWon
                  ? "font-bold text-green-500"
                  : "text-text-primary"
              }`}
            >
              {teamBNames}
              {teamBWon && <Trophy size={14} className="text-black shrink-0" />}
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${
                teamBWon ? "text-green-500" : "text-neutral"
              }`}
            >
              {teamBSetsWon}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
