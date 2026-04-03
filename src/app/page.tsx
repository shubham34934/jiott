"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Zap, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import { MatchCard } from "@/components/MatchCard";

export default function HomePage() {
  const { data: session } = useSession();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", "recent"],
    queryFn: () => fetch("/api/matches?limit=5").then((r) => r.json()),
  });

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="px-4 pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {firstName ? `Hello, ${firstName}! 👋` : "JioTT 🏓"}
        </h1>
        <p className="text-sm text-neutral mt-1">
          {firstName ? "Ready to play?" : "Table Tennis Tracker"}
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <Link href={session ? "/matches/new" : "/auth/signin"} className="block">
          <Button fullWidth size="lg">
            <Zap size={18} />
            Start Match
          </Button>
        </Link>
        <Link href={session ? "/tournaments/new" : "/auth/signin"} className="block">
          <Button variant="secondary" fullWidth size="lg">
            <Plus size={18} />
            Create Tournament
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">
            Recent Matches
          </h2>
          <Link
            href="/matches"
            className="text-sm font-medium text-primary flex items-center gap-0.5"
          >
            View all
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface rounded-xl border border-border p-4 h-24 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && matches?.length === 0 && (
            <p className="text-sm text-neutral text-center py-8">
              No matches yet. Start your first match!
            </p>
          )}
          {matches?.map(
            (match: {
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
            }) => (
              <MatchCard
                key={match.id}
                id={match.id}
                status={match.status}
                isFriendly={match.isFriendly}
                participants={match.participants}
                sets={match.sets}
                createdAt={match.createdAt}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
