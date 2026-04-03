"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/MatchCard";

type FilterTab = "all" | "ONGOING" | "COMPLETED" | "FRIENDLY";

export default function MatchesPage() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", filter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter === "ONGOING" || filter === "COMPLETED") {
        params.set("status", filter);
      } else if (filter === "FRIENDLY") {
        params.set("friendly", "true");
      }
      const qs = params.toString();
      const url = qs ? `/api/matches?${qs}` : "/api/matches";
      return fetch(url).then((r) => r.json());
    },
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "ONGOING", label: "Ongoing" },
    { key: "COMPLETED", label: "Completed" },
    { key: "FRIENDLY", label: "Friendly" },
  ];

  return (
    <div className="px-4 pt-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Matches</h1>

      <div className="flex rounded-xl bg-surface border border-border p-1 mb-6" suppressHydrationWarning>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              filter === tab.key
                ? "bg-background text-text-primary shadow-sm"
                : "text-neutral"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-neutral text-sm">
            Loading matches...
          </div>
        )}
        {matches?.length === 0 && !isLoading && (
          <p className="text-sm text-neutral text-center py-12">
            No matches found.
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
  );
}
