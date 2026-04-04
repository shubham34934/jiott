"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TeamPlayersLinks } from "@/components/PlayerProfileLink";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

interface TeamData {
  id: string;
  player1: { id: string; user: { name: string | null } };
  player2: { id: string; user: { name: string | null } } | null;
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
    id: string;
    sets: Array<{ teamAScore: number; teamBScore: number }>;
  } | null;
}

interface TournamentData {
  id: string;
  name: string;
  type: string;
  matchType: string;
  status: string;
  teams: TeamData[];
  matches: TournamentMatchData[];
  winnerTeam: TeamData | null;
  runnerUpTeam: TeamData | null;
  canDelete?: boolean;
}

function matchDetailHref(matchId: string, tournamentId: string) {
  const returnTo = encodeURIComponent(`/tournaments/${tournamentId}`);
  return `/matches/${matchId}?returnTo=${returnTo}`;
}

export default function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteTournamentOpen, setDeleteTournamentOpen] = useState(false);

  const { data: tournament, isLoading } = useQuery<TournamentData>({
    queryKey: ["tournament", id],
    queryFn: () => fetch(`/api/tournaments/${id}`).then((r) => r.json()),
    staleTime: QUERY_STALE_TIME_MS,
  });

  const deleteTournament = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/tournaments/${id}`, { method: "DELETE" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Failed to delete tournament"
        );
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.push("/tournaments");
    },
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
    if (tournament.type === "ROUND_ROBIN") {
      return "Round robin";
    }
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi Finals";
    if (round === totalRounds - 2) return "Quarter Finals";
    return `Round ${round}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/tournaments" className="p-1" aria-label="Back to tournaments">
            <ArrowLeft size={22} className="text-text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text-primary">{tournament.name}</h1>
            <p className="text-xs text-neutral">
              {tournament.type === "ROUND_ROBIN" ? "Round robin" : "Knockout"}{" "}
              &middot; {tournament.matchType} &middot; {tournament.teams.length}{" "}
              teams
            </p>
          </div>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      {tournament.status === "COMPLETED" &&
        (tournament.winnerTeam || tournament.runnerUpTeam) && (
          <div className="mx-4 mt-4 rounded-xl border border-success/30 bg-success/5 p-4">
            <h2 className="text-xs font-bold text-neutral uppercase tracking-wide mb-3">
              Final results
            </h2>
            <div className="space-y-3">
              {tournament.winnerTeam && (
                <div>
                  <p className="text-xs text-neutral mb-1">Champion</p>
                  <p className="text-base font-bold text-text-primary flex items-center gap-2 flex-wrap">
                    <Trophy
                      size={20}
                      className="text-warning shrink-0"
                      aria-hidden
                    />
                    <span className="font-bold">
                      <TeamPlayersLinks
                        team={tournament.winnerTeam}
                        className="font-bold text-text-primary underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
                      />
                    </span>
                  </p>
                </div>
              )}
              {tournament.runnerUpTeam && (
                <div>
                  <p className="text-xs text-neutral mb-1">Runner-up</p>
                  <p className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                    <Medal
                      size={18}
                      className="text-neutral shrink-0"
                      aria-hidden
                    />
                    <span className="font-semibold">
                      <TeamPlayersLinks
                        team={tournament.runnerUpTeam}
                        className="font-semibold text-text-primary underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
                      />
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      <div className="px-4 pt-4 overflow-x-auto touch-pan-x">
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
                    <BracketMatchCard
                      key={m.id}
                      match={m}
                      tournamentId={id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        <h3 className="font-bold text-base mb-3">All Matches</h3>
        <div className="flex flex-col gap-3">
          {tournament.matches.map((m) => {
            const setsSummary =
              m.match?.sets?.length
                ? m.match.sets
                    .map((s) => `${s.teamAScore}-${s.teamBScore}`)
                    .join(", ")
                : null;

            const cardClass = `bg-surface rounded-xl border p-4 ${
              m.status === "LOCKED"
                ? "border-border opacity-50"
                : m.status === "READY" || m.status === "ONGOING"
                  ? "border-primary"
                  : "border-border"
            }`;

            const inner = (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral font-medium">
                    {getRoundLabel(m.round)} &middot; Match {m.position + 1}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm min-w-0 truncate">
                    <TeamPlayersLinks
                      team={m.teamA}
                      stopPropagation={!!m.match}
                      className={
                        m.winnerId === m.teamAId
                          ? "font-bold text-success underline underline-offset-[3px] decoration-1 decoration-success/55 hover:decoration-success"
                          : "text-text-primary underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
                      }
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm min-w-0 truncate">
                    <TeamPlayersLinks
                      team={m.teamB}
                      stopPropagation={!!m.match}
                      className={
                        m.winnerId === m.teamBId
                          ? "font-bold text-success underline underline-offset-[3px] decoration-1 decoration-success/55 hover:decoration-success"
                          : "text-text-primary underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
                      }
                    />
                  </span>
                </div>
                {setsSummary && (
                  <p className="text-xs text-neutral mt-2">Sets: {setsSummary}</p>
                )}
              </>
            );

            const href = m.match
              ? matchDetailHref(m.match.id, id)
              : null;
            return href ? (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label="Open match"
                onClick={() => router.push(href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(href);
                  }
                }}
                className={`relative z-10 block w-full cursor-pointer touch-manipulation ${cardClass} active:scale-[0.99] transition-transform`}
              >
                {inner}
              </div>
            ) : (
              <div key={m.id} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      {tournament.canDelete && (
        <div className="px-4 pb-8">
          <Button
            fullWidth
            variant="secondary"
            size="lg"
            className="border-danger/45 text-danger hover:bg-danger/12"
            onClick={() => setDeleteTournamentOpen(true)}
            disabled={deleteTournament.isPending}
          >
            {deleteTournament.isPending ? "Deleting..." : "Delete tournament"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTournamentOpen}
        onClose={() => setDeleteTournamentOpen(false)}
        title="Delete this tournament?"
        description={`“${tournament.name}” and all linked matches will be removed permanently. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={deleteTournament.isPending}
        onConfirm={() => deleteTournament.mutate()}
      />
    </div>
  );
}

function BracketMatchCard({
  match,
  tournamentId,
}: {
  match: TournamentMatchData;
  tournamentId: string;
}) {
  const router = useRouter();
  const isLocked = match.status === "LOCKED";
  const isCompleted = match.status === "COMPLETED";
  const isPlayable =
    match.status === "READY" || match.status === "ONGOING";

  const className = `rounded-xl border p-3 text-sm ${
    isLocked
      ? "bg-surface-raised border-border opacity-50"
      : isPlayable
        ? "bg-surface border-primary shadow-sm"
        : isCompleted
          ? "bg-surface border-success"
          : "bg-surface border-border"
  }`;

  const inner = (
    <>
      <div
        className={`flex items-center justify-between py-1 ${
          match.winnerId === match.teamAId
            ? "font-bold text-success"
            : "text-text-primary"
        }`}
      >
        <span className="truncate min-w-0">
          <TeamPlayersLinks
            team={match.teamA}
            stopPropagation={!!match.match}
            className={
              match.winnerId === match.teamAId
                ? "font-bold text-success underline underline-offset-[3px] decoration-1 decoration-success/55 hover:decoration-success"
                : "text-text-primary underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
            }
          />
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
        <span className="truncate min-w-0">
          <TeamPlayersLinks
            team={match.teamB}
            stopPropagation={!!match.match}
            className={
              match.winnerId === match.teamBId
                ? "font-bold text-success underline underline-offset-[3px] decoration-1 decoration-success/55 hover:decoration-success"
                : "text-text-primary underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
            }
          />
        </span>
      </div>
    </>
  );

  if (match.match) {
    const href = matchDetailHref(match.match.id, tournamentId);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Open match"
        onClick={() => router.push(href)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(href);
          }
        }}
        className={`relative z-10 block cursor-pointer touch-manipulation active:scale-[0.99] transition-transform ${className}`}
      >
        {inner}
      </div>
    );
  }

  return <div className={className}>{inner}</div>;
}
