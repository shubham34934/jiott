"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import Link from "next/link";

interface LeaderboardPlayer {
  id: string;
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
  user: { name: string | null; image: string | null };
}

const podiumIcons = ["🥇", "🥈", "🥉"];
const podiumBorderColors = [
  "border-yellow-400",
  "border-gray-300",
  "border-amber-600",
];

export default function LeaderboardPage() {
  const { data: players, isLoading } = useQuery<LeaderboardPlayer[]>({
    queryKey: ["leaderboard"],
    queryFn: () => fetch("/api/leaderboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-8 text-center text-neutral text-sm">
        Loading...
      </div>
    );
  }

  const topThree = players?.slice(0, 3) || [];
  const rest = players?.slice(3) || [];

  return (
    <div className="px-4 pt-8">
      <h1 className="text-2xl font-bold text-text-primary">Leaderboard</h1>
      <p className="text-sm text-neutral mt-1 mb-6">Top ranked players</p>

      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {topThree.map((p, i) => {
            const winRate =
              p.matchesPlayed > 0
                ? Math.round((p.matchesWon / p.matchesPlayed) * 100)
                : 0;

            return (
              <Link key={p.id} href={`/players/${p.id}`}>
                <div
                  className={`bg-yellow-50/50 rounded-xl border-2 ${podiumBorderColors[i]} p-3 text-center`}
                >
                  <span className="text-2xl">{podiumIcons[i]}</span>
                  <p className="font-semibold text-sm mt-2 truncate">
                    {p.user.name}
                  </p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {p.rating}
                  </p>
                  <p className="text-xs text-neutral">{winRate}% win</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {players?.map((p, i) => {
          const winRate =
            p.matchesPlayed > 0
              ? Math.round((p.matchesWon / p.matchesPlayed) * 100)
              : 0;

          return (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="block w-full"
            >
              <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
                <span className="text-lg font-bold text-neutral w-8 text-center tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {p.user.name}
                  </p>
                  <p className="text-xs text-neutral">
                    {p.matchesPlayed} matches &middot; {winRate}% win
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary tabular-nums">
                    {p.rating}
                  </p>
                  <p className="text-xs text-neutral">rating</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
