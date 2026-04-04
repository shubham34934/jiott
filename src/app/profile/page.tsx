"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Trophy, Target, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/Button";
import { JioTTAuthMark } from "@/components/JioTTLogo";
import { useNeonAppSession } from "@/hooks/useNeonAppSession";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export default function ProfilePage() {
  const { data: session, status, signOut } = useNeonAppSession();

  const { data: player } = useQuery({
    queryKey: ["player", session?.user?.playerId],
    queryFn: () =>
      fetch(`/api/players/${session?.user?.playerId}`).then((r) => r.json()),
    enabled: !!session?.user?.playerId,
    staleTime: QUERY_STALE_TIME_MS,
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
        <JioTTAuthMark />
        <Trophy size={48} className="text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2 text-text-primary">Welcome to JioTT</h2>
        <p className="text-sm text-neutral mb-6 text-center">
          Sign in to track your matches and compete on the leaderboard
        </p>
        <div className="flex w-full max-w-xs flex-col gap-4">
          <Link href="/auth/signin" className="w-full">
            <Button fullWidth size="lg">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/register" className="w-full">
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
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <button
          type="button"
          onClick={() => void signOut()}
          className="p-2 text-neutral hover:text-text-primary"
          aria-label="Sign out"
        >
          <LogOut size={22} />
        </button>
      </div>

      <div className="mx-4 rounded-2xl bg-gradient-to-br from-secondary to-primary p-6 text-white shadow-[0_12px_40px_-12px_rgba(94,158,255,0.45)] ring-1 ring-white/15">
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
        <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm ring-1 ring-white/[0.03]">
          <Trophy size={20} className="text-primary mx-auto mb-2" />
          <p className="text-xl font-bold text-text-primary">{player?.rating || 1000}</p>
          <p className="text-xs text-neutral">Rating</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm ring-1 ring-white/[0.03]">
          <Target size={20} className="text-success mx-auto mb-2" />
          <p className="text-xl font-bold text-text-primary">{player?.matchesWon || 0}</p>
          <p className="text-xs text-neutral">Wins</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm ring-1 ring-white/[0.03]">
          <TrendingUp size={20} className="text-secondary mx-auto mb-2" />
          <p className="text-xl font-bold text-text-primary">{winRate}%</p>
          <p className="text-xs text-neutral">Win Rate</p>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h3 className="mb-3 text-base font-bold text-text-primary">Match History</h3>
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
