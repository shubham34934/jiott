"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TournamentListCard } from "@/components/TournamentListCard";
import { Button } from "@/components/Button";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

interface TeamLike {
  player1: { user: { name: string | null } };
  player2: { user: { name: string | null } } | null;
}

interface TournamentListItem {
  id: string;
  name: string;
  matchType: string;
  status: string;
  createdAt: string;
  _count: { matches: number; teams: number };
  matches: Array<{
    winner: TeamLike | null;
  }>;
}

function getTeamName(team: TeamLike | null): string {
  if (!team) return "—";
  const p1 = team.player1?.user?.name || "?";
  const p2 = team.player2?.user?.name;
  return p2 ? `${p1} & ${p2}` : p1;
}

export default function TournamentsListPage() {
  const { data: session } = authClient.useSession();

  const { data: tournaments, isLoading } = useQuery<TournamentListItem[]>({
    queryKey: ["tournaments"],
    queryFn: () => fetch("/api/tournaments").then((r) => r.json()),
    staleTime: QUERY_STALE_TIME_MS,
  });

  return (
    <div className="px-4 pt-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tournaments</h1>
          <p className="text-sm text-neutral mt-1">
            Brackets, winners, and match history
          </p>
        </div>
        <Link href={session ? "/tournaments/new" : "/auth/signin"} className="shrink-0">
          <Button size="sm" variant="secondary">
            <Plus size={16} />
            New
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-neutral text-sm">
          Loading tournaments...
        </div>
      )}

      {!isLoading && (!tournaments || tournaments.length === 0) && (
        <div className="text-center py-12 px-4">
          <p className="text-sm text-neutral mb-4">
            No tournaments yet. Create one to run a bracket.
          </p>
          <Link href={session ? "/tournaments/new" : "/auth/signin"}>
            <Button fullWidth>Create tournament</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3 pb-4">
        {tournaments?.map((t) => {
          const finalMatch = t.matches[0];
          const champion =
            t.status === "COMPLETED" && finalMatch?.winner
              ? getTeamName(finalMatch.winner)
              : null;

          return (
            <TournamentListCard
              key={t.id}
              href={`/tournaments/${t.id}`}
              title={t.name}
              status={t.status}
              meta={`${t.matchType} · ${t._count.teams} teams · ${t._count.matches} bracket matches`}
              highlight={champion ? `Winner: ${champion}` : null}
            />
          );
        })}
      </div>
    </div>
  );
}
