"use client";

import { MatchCard } from "@/components/MatchCard";

function MatchCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-24 bg-border rounded-full" />
        <div className="h-3 w-16 bg-border rounded" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-40 bg-border rounded" />
          <div className="h-5 w-6 bg-border rounded" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-32 bg-border rounded" />
          <div className="h-5 w-6 bg-border rounded" />
        </div>
      </div>
    </div>
  );
}

export type MatchListItem = {
  id: string;
  type?: "SINGLES" | "DOUBLES";
  status: "ONGOING" | "COMPLETED" | "DISPUTED";
  isFriendly?: boolean;
  isTournamentMatch?: boolean;
  tournamentName?: string | null;
  participants: Array<{
    team: "A" | "B";
    rankedRatingDelta?: number | null;
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
  /** How many skeleton rows to render while loading. */
  skeletonCount?: number;
  emptyMessage?: string;
  linkPrefix?: string;
}

export function MatchListCards({
  matches,
  isLoading,
  skeletonCount = 3,
  emptyMessage = "No matches found.",
  linkPrefix = "/matches",
}: MatchListCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonCount }, (_, i) => `skel-${i}`).map(
          (key) => (
            <MatchCardSkeleton key={key} />
          )
        )}
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
