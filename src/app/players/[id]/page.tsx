"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/Button";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: () => fetch(`/api/players/${id}`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-8 text-center text-neutral text-sm">
        Loading...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="px-4 pt-8 text-center text-neutral text-sm">
        Player not found
      </div>
    );
  }

  const winRate =
    player.matchesPlayed > 0
      ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
      : 0;
  const losses = player.matchesPlayed - player.matchesWon;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border">
        <Link href="/players" className="p-1">
          <ArrowLeft size={22} className="text-text-primary" />
        </Link>
        <h1 className="text-lg font-bold">Player Profile</h1>
      </div>

      <div className="bg-gradient-to-br from-secondary to-primary rounded-2xl mx-4 mt-4 p-6 text-white">
        <div className="flex items-center gap-4 mb-2">
          <Avatar
            name={player.user.name || ""}
            image={player.user.image}
            size="xl"
          />
          <div>
            <h2 className="text-xl font-bold">{player.user.name}</h2>
            <span className="inline-block mt-1 text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">
              Rank #{player._rank || "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <Trophy size={20} className="text-primary mb-2" />
          <p className="text-2xl font-bold">{player.rating}</p>
          <p className="text-xs text-neutral">Rating</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <Target size={20} className="text-success mb-2" />
          <p className="text-2xl font-bold">{player.matchesWon}</p>
          <p className="text-xs text-neutral">Total Wins</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <TrendingUp size={20} className="text-secondary mb-2" />
          <p className="text-2xl font-bold">{player.matchesPlayed}</p>
          <p className="text-xs text-neutral">Matches</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <TrendingUp size={20} className="text-secondary mb-2" />
          <p className="text-2xl font-bold">{winRate}%</p>
          <p className="text-xs text-neutral">Win Rate</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border mx-4 mt-4 p-4">
        <h3 className="font-semibold text-base mb-3">Performance Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral">Wins</span>
            <span className="font-semibold text-success">
              {player.matchesWon}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral">Losses</span>
            <span className="font-semibold text-danger">{losses}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <Link href={`/matches/new?opponent=${id}`}>
          <Button fullWidth size="lg">
            Challenge Player
          </Button>
        </Link>
      </div>

      <div className="px-4 mt-6 mb-4">
        <h3 className="font-bold text-base mb-3">Match History</h3>
        <div className="space-y-3">
          {player.matchParticipations?.length === 0 && (
            <p className="text-sm text-neutral text-center py-4">
              No matches yet
            </p>
          )}
          {player.matchParticipations?.map(
            (mp: {
              match: {
                id: string;
                status: "ONGOING" | "COMPLETED" | "DISPUTED";
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
            }) => (
              <MatchCard
                key={mp.match.id}
                id={mp.match.id}
                status={mp.match.status}
                participants={mp.match.participants}
                sets={mp.match.sets}
                createdAt={mp.match.createdAt}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
