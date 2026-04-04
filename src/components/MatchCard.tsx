"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Trophy } from "lucide-react";
import { PlayerProfileLink } from "@/components/PlayerProfileLink";
import { RatingDeltaBadge } from "@/components/RatingDeltaBadge";
import { formatDisplayDate } from "@/lib/formatDisplayDate";

interface Player {
  id: string;
  user: { name: string | null; image: string | null };
}

interface Participant {
  team: "A" | "B";
  rankedRatingDelta?: number | null;
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

function teamNameLinks(
  team: Participant[],
  winClass: boolean,
  stopPropagation: boolean
) {
  const nameClass = `text-sm hover:underline ${
    winClass ? "font-bold text-success" : "font-medium text-text-primary"
  }`;
  /* One wrapper so the parent row’s flex gap does not sit between players */
  return (
    <span className="inline-flex flex-wrap items-center min-w-0">
      {team.map((p, i) => (
        <Fragment key={p.player.id}>
          {i > 0 ? (
            <span className="text-sm text-neutral mx-1.5 shrink-0">&</span>
          ) : null}
          <PlayerProfileLink
            playerId={p.player.id}
            stopPropagation={stopPropagation}
            className={nameClass}
          >
            {p.player.user.name || "Unknown"}
          </PlayerProfileLink>
        </Fragment>
      ))}
    </span>
  );
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
  const router = useRouter();
  const matchHref = `${linkPrefix}/${id}`;

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

  const date = formatDisplayDate(createdAt);

  const goToMatch = () => {
    router.push(matchHref);
  };

  return (
    <div
      className="bg-surface rounded-xl border border-border p-4 cursor-pointer shadow-sm transition-all hover:border-primary/35 hover:shadow-[0_0_0_1px_rgba(94,158,255,0.12)]"
      onClick={goToMatch}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToMatch();
        }
      }}
      tabIndex={0}
      aria-label={`View match on ${date}`}
    >
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
            <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/15 rounded-full px-2.5 py-1">
              Friendly
            </span>
          )}
        </div>
        <span className="text-xs text-neutral">{date}</span>
      </div>

      {isTournamentMatch && tournamentName && (
        <div className="mb-3">
          <span className="inline-flex max-w-full items-center text-xs font-medium text-warning bg-warning/15 rounded-full px-2.5 py-1 truncate">
            Tournament:{" "}
            <b className="font-bold">{tournamentName}</b>
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
            {teamNameLinks(teamA, teamAWon, true)}
            {teamAWon && (
              <Trophy size={14} className="text-warning shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status === "COMPLETED" &&
              !isFriendly &&
              teamA[0]?.rankedRatingDelta != null && (
                <RatingDeltaBadge
                  delta={teamA[0].rankedRatingDelta}
                  size="sm"
                />
              )}
            <span
              className={`text-lg font-bold tabular-nums ${
                teamAWon ? "text-success" : "text-neutral"
              }`}
            >
              {teamASetsWon}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
            {teamNameLinks(teamB, teamBWon, true)}
            {teamBWon && (
              <Trophy size={14} className="text-warning shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status === "COMPLETED" &&
              !isFriendly &&
              teamB[0]?.rankedRatingDelta != null && (
                <RatingDeltaBadge
                  delta={teamB[0].rankedRatingDelta}
                  size="sm"
                />
              )}
            <span
              className={`text-lg font-bold tabular-nums ${
                teamBWon ? "text-success" : "text-neutral"
              }`}
            >
              {teamBSetsWon}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
