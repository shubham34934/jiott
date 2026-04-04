"use client";

import { MatchCard } from "@/components/MatchCard";

export type MatchListItem = {
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

export interface MatchListCardsProps {
  matches: MatchListItem[];
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  linkPrefix?: string;
}

export function MatchListCards({
  matches,
  isLoading,
  loadingMessage = "Loading matches...",
  emptyMessage = "No matches found.",
  linkPrefix = "/matches",
}: MatchListCardsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-neutral text-sm">
        {loadingMessage}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <p className="text-sm text-neutral text-center py-12">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
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
          linkPrefix={linkPrefix}
        />
      ))}
    </div>
  );
}
