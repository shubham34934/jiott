"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { PlayerCard } from "@/components/PlayerCard";

type PlayerSort = "rating" | "matchesPlayed" | "matchesWon";

const SORT_OPTIONS: { key: PlayerSort; label: string }[] = [
  { key: "rating", label: "Rating" },
  { key: "matchesPlayed", label: "Matches played" },
  { key: "matchesWon", label: "Wins" },
];

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<PlayerSort>("rating");

  const { data: players, isLoading } = useQuery({
    queryKey: ["players", sortBy],
    queryFn: () =>
      fetch(`/api/players?sortBy=${sortBy}`).then((r) => r.json()),
  });

  const filtered = players?.filter(
    (p: { user: { name: string | null } }) =>
      p.user.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 pt-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Players</h1>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral"
        />
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-surface border border-border rounded-xl text-sm placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowDownWideNarrow
            size={16}
            className="text-neutral shrink-0"
            aria-hidden
          />
          <span className="text-xs font-semibold text-text-primary">
            Sort by
          </span>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Sort players"
        >
          {SORT_OPTIONS.map(({ key, label }) => {
            const selected = sortBy === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
                  selected
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-primary border-border hover:bg-background"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-neutral text-sm">
            Loading players...
          </div>
        )}
        {filtered?.length === 0 && !isLoading && (
          <p className="text-sm text-neutral text-center py-12">
            No players found.
          </p>
        )}
        {filtered?.map(
          (player: {
            id: string;
            rating: number;
            matchesPlayed: number;
            matchesWon: number;
            user: { name: string | null };
          }) => (
            <PlayerCard
              key={player.id}
              id={player.id}
              name={player.user.name || "Unknown"}
              rating={player.rating}
              matchesPlayed={player.matchesPlayed}
              matchesWon={player.matchesWon}
            />
          )
        )}
      </div>
    </div>
  );
}
