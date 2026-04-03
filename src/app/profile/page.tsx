"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Trophy, Target, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/Button";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  const { data: player } = useQuery({
    queryKey: ["player", session?.user?.playerId],
    queryFn: () =>
      fetch(`/api/players/${session?.user?.playerId}`).then((r) => r.json()),
    enabled: !!session?.user?.playerId,
  });

  if (status === "loading") {
    return (
      <div className="px-4 pt-8 text-center text-neutral text-sm">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-4 pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Trophy size={48} className="text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2">Welcome to JioTT</h2>
        <p className="text-sm text-neutral mb-6 text-center">
          Sign in to track your matches and compete on the leaderboard
        </p>
        <div className="space-y-3 w-full max-w-xs">
          <Button onClick={() => signIn()} fullWidth size="lg">
            Sign in
          </Button>
          <Link href="/auth/register">
            <Button variant="secondary" fullWidth size="lg">
              Create account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const winRate =
    player?.matchesPlayed > 0
      ? Math.round((player.matchesWon / player.matchesPlayed) * 100)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-8 mb-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <button
          type="button"
          onClick={() => signOut()}
          className="p-2 text-neutral hover:text-text-primary"
          aria-label="Sign out"
        >
          <LogOut size={22} />
        </button>
      </div>

      <div className="bg-gradient-to-br from-secondary to-primary rounded-2xl mx-4 p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar
            name={session.user.name || ""}
            image={session.user.image}
            size="xl"
          />
          <div className="min-w-0">
            <span className="inline-block mb-1.5 text-xs bg-white/20 rounded-full px-2.5 py-1 font-medium">
              Rank #{player?._rank ?? "—"}
            </span>
            <h2 className="text-xl font-bold truncate">{session.user.name}</h2>
            <p className="text-sm text-white/80">Competitive Player</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <Trophy size={20} className="text-primary mx-auto mb-2" />
          <p className="text-xl font-bold">{player?.rating || 1000}</p>
          <p className="text-xs text-neutral">Rating</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <Target size={20} className="text-success mx-auto mb-2" />
          <p className="text-xl font-bold">{player?.matchesWon || 0}</p>
          <p className="text-xs text-neutral">Wins</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <TrendingUp size={20} className="text-secondary mx-auto mb-2" />
          <p className="text-xl font-bold">{winRate}%</p>
          <p className="text-xs text-neutral">Win Rate</p>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h3 className="font-bold text-base mb-3">Match History</h3>
        <div className="space-y-3">
          {player?.matchParticipations?.length === 0 && (
            <p className="text-sm text-neutral text-center py-4">
              No matches yet
            </p>
          )}
          {player?.matchParticipations?.map(
            (mp: {
              match: {
                id: string;
                status: "ONGOING" | "COMPLETED" | "DISPUTED";
                isFriendly?: boolean;
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
                isFriendly={mp.match.isFriendly}
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
