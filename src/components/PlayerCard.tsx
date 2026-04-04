import Link from "next/link";
import { Trophy, TrendingUp } from "lucide-react";

interface PlayerCardProps {
  id: string;
  name: string;
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
}

export function PlayerCard({
  id,
  name,
  rating,
  matchesPlayed,
  matchesWon,
}: PlayerCardProps) {
  const winRate =
    matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

  return (
    <Link href={`/players/${id}`} className="block">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm ring-1 ring-white/[0.03] transition-colors hover:border-border-strong">
        <div>
          <p className="font-semibold text-sm text-text-primary">{name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-neutral">
              <Trophy size={12} />
              {rating}
            </span>
            <span className="text-xs text-neutral">
              {matchesPlayed} matches
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-success flex items-center gap-1 justify-end">
            {winRate}%
            <TrendingUp size={14} />
          </p>
          <p className="text-xs text-neutral">{matchesWon} wins</p>
        </div>
      </div>
    </Link>
  );
}
