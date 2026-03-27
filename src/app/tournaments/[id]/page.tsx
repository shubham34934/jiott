"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface TeamData {
  id: string;
  player1: { user: { name: string | null } };
  player2: { user: { name: string | null } } | null;
}

interface TournamentMatchData {
  id: string;
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  status: string;
  teamA: TeamData | null;
  teamB: TeamData | null;
  winner: TeamData | null;
  match: {
    sets: Array<{ teamAScore: number; teamBScore: number }>;
  } | null;
}

interface TournamentData {
  id: string;
  name: string;
  matchType: string;
  status: string;
  teams: TeamData[];
  matches: TournamentMatchData[];
}

function getTeamName(team: TeamData | null): string {
  if (!team) return "TBD";
  const p1 = team.player1?.user?.name || "?";
  const p2 = team.player2?.user?.name;
  return p2 ? `${p1} & ${p2}` : p1;
}

export default function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: tournament, isLoading } = useQuery<TournamentData>({
    queryKey: ["tournament", id],
    queryFn: () => fetch(`/api/tournaments/${id}`).then((r) => r.json()),
  });

  if (isLoading || !tournament) {
    return (
      <div className="px-4 pt-8 text-center text-neutral text-sm">
        Loading...
      </div>
    );
  }

  const rounds = new Map<number, TournamentMatchData[]>();
  for (const m of tournament.matches) {
    const arr = rounds.get(m.round) || [];
    arr.push(m);
    rounds.set(m.round, arr);
  }

  const roundNumbers = Array.from(rounds.keys()).sort((a, b) => a - b);
  const totalRounds = roundNumbers.length;

  const getRoundLabel = (round: number) => {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi Finals";
    if (round === totalRounds - 2) return "Quarter Finals";
    return `Round ${round}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1">
            <ArrowLeft size={22} className="text-text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">{tournament.name}</h1>
            <p className="text-xs text-neutral">
              {tournament.matchType} &middot; {tournament.teams.length} teams
            </p>
          </div>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      <div className="px-4 pt-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {roundNumbers.map((round) => {
            const matches = rounds.get(round) || [];
            return (
              <div key={round} className="flex flex-col gap-3 min-w-[200px]">
                <h3 className="text-xs font-bold text-neutral uppercase tracking-wide text-center mb-1">
                  {getRoundLabel(round)}
                </h3>
                <div className="flex flex-col justify-around flex-1 gap-3">
                  {matches.map((m) => (
                    <BracketMatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        <h3 className="font-bold text-base mb-3">All Matches</h3>
        <div className="space-y-3">
          {tournament.matches.map((m) => (
            <div
              key={m.id}
              className={`bg-surface rounded-xl border p-4 ${
                m.status === "LOCKED"
                  ? "border-border opacity-50"
                  : m.status === "READY"
                  ? "border-primary"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral font-medium">
                  {getRoundLabel(m.round)} &middot; Match {m.position + 1}
                </span>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm ${
                    m.winnerId === m.teamAId
                      ? "font-bold text-success"
                      : "text-text-primary"
                  }`}
                >
                  {getTeamName(m.teamA)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm ${
                    m.winnerId === m.teamBId
                      ? "font-bold text-success"
                      : "text-text-primary"
                  }`}
                >
                  {getTeamName(m.teamB)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({ match }: { match: TournamentMatchData }) {
  const isLocked = match.status === "LOCKED";
  const isCompleted = match.status === "COMPLETED";

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        isLocked
          ? "bg-gray-50 border-border opacity-50"
          : match.status === "READY"
          ? "bg-surface border-primary shadow-sm"
          : isCompleted
          ? "bg-surface border-success"
          : "bg-surface border-border"
      }`}
    >
      <div
        className={`flex items-center justify-between py-1 ${
          match.winnerId === match.teamAId
            ? "font-bold text-success"
            : "text-text-primary"
        }`}
      >
        <span className="truncate">
          {getTeamName(match.teamA)}
        </span>
      </div>
      <div className="border-t border-border my-1" />
      <div
        className={`flex items-center justify-between py-1 ${
          match.winnerId === match.teamBId
            ? "font-bold text-success"
            : "text-text-primary"
        }`}
      >
        <span className="truncate">
          {getTeamName(match.teamB)}
        </span>
      </div>
    </div>
  );
}
