"use client";

import { Suspense, use, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Medal } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SetScoreRow } from "@/components/SetScoreRow";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatDisplayDate } from "@/lib/formatDisplayDate";
import { PlayerProfileLink } from "@/components/PlayerProfileLink";

interface Participant {
  team: "A" | "B";
  player: {
    id: string;
    rating: number;
    user: { name: string | null; image: string | null };
  };
}

interface SetData {
  id: string;
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
}

interface EventLogEntry {
  id: string;
  action: string;
  newValue: Record<string, unknown> | null;
  updatedBy: string;
  updatedByUser: { name: string | null };
  createdAt: string;
}

interface TournamentContext {
  id: string;
  name: string;
  format: string;
  matchType: string;
  status: string;
  teamCount: number;
  round: number;
  position: number;
}

interface MatchData {
  id: string;
  type: string;
  status: "ONGOING" | "COMPLETED" | "DISPUTED";
  totalSets: number;
  pointsPerSet: number;
  isFriendly: boolean;
  participants: Participant[];
  sets: SetData[];
  eventLogs: EventLogEntry[];
  createdAt: string;
  tournamentContext?: TournamentContext | null;
  canDelete?: boolean;
}

/** Only same-app relative paths; blocks open redirects. */
function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  return decoded;
}

function MatchBackLink({ fallbackHref }: { fallbackHref: string }) {
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"));
  const href = returnTo ?? fallbackHref;
  return (
    <Link href={href} className="p-1" aria-label="Back">
      <ArrowLeft size={22} className="text-text-primary" />
    </Link>
  );
}

function participantNameRow(team: Participant[], won: boolean) {
  const cls = won ? "font-semibold text-sm text-success" : "font-semibold text-sm";
  return (
    <p className={cls}>
      {team.map((p, i) => (
        <span key={p.player.id}>
          {i > 0 ? " & " : null}
          <PlayerProfileLink
            playerId={p.player.id}
            className={
              won
                ? "text-inherit underline underline-offset-[3px] decoration-1 decoration-green-600/60 hover:decoration-green-700"
                : "text-inherit underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
            }
          >
            {p.player.user.name || "Unknown"}
          </PlayerProfileLink>
        </span>
      ))}
    </p>
  );
}

function isValidSetScore(a: number, b: number, target: number): boolean {
  if (a < 0 || b < 0) return false;
  const winner = Math.max(a, b);
  const loser = Math.min(a, b);
  if (winner < target) return false;
  if (a === b) return false;
  if (winner === target && loser < target - 1) return true;
  if (winner > target && loser >= target - 1) return winner - loser === 2;
  return false;
}

/** First word only — used in set score cards to save space. */
function displayFirstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "Unknown";
  return t.split(/\s+/)[0] ?? t;
}

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteMatchOpen, setDeleteMatchOpen] = useState(false);

  const { data: match, isLoading } = useQuery<MatchData>({
    queryKey: ["match", id],
    queryFn: () => fetch(`/api/matches/${id}`).then((r) => r.json()),
  });

  const savingSetRef = useRef(-1);

  const updateScore = useMutation({
    mutationFn: (data: {
      setNumber: number;
      teamAScore: number;
      teamBScore: number;
    }) => {
      savingSetRef.current = data.setNumber;
      return fetch(`/api/matches/${id}/sets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    },
    onSettled: () => {
      savingSetRef.current = -1;
      queryClient.invalidateQueries({ queryKey: ["match", id] });
    },
  });

  const completeMatch = useMutation({
    mutationFn: () =>
      fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", id] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      const m = queryClient.getQueryData<MatchData>(["match", id]);
      if (m?.tournamentContext?.id) {
        queryClient.invalidateQueries({
          queryKey: ["tournament", m.tournamentContext.id],
        });
      }
      for (const p of m?.participants ?? []) {
        queryClient.invalidateQueries({ queryKey: ["player", p.player.id] });
      }
    },
  });

  const deleteMatch = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/matches/${id}`, { method: "DELETE" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to delete match"
        );
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      const m = queryClient.getQueryData<MatchData>(["match", id]);
      if (m?.tournamentContext?.id) {
        queryClient.invalidateQueries({
          queryKey: ["tournament", m.tournamentContext.id],
        });
      }
      const params = new URLSearchParams(window.location.search);
      const to = safeReturnPath(params.get("returnTo"));
      router.push(to ?? "/matches");
    },
  });

  if (isLoading || !match) {
    return (
      <div className="px-4 pt-8 text-center text-neutral text-sm">
        Loading...
      </div>
    );
  }

  const teamA = match.participants.filter((p) => p.team === "A");
  const teamB = match.participants.filter((p) => p.team === "B");

  const teamANames = teamA
    .map((p) => displayFirstName(p.player.user.name || "Unknown"))
    .join(" & ");
  const teamBNames = teamB
    .map((p) => displayFirstName(p.player.user.name || "Unknown"))
    .join(" & ");

  let teamASetsWon = 0;
  let teamBSetsWon = 0;
  for (const set of match.sets) {
    if (isValidSetScore(set.teamAScore, set.teamBScore, match.pointsPerSet)) {
      if (set.teamAScore > set.teamBScore) teamASetsWon++;
      else if (set.teamBScore > set.teamAScore) teamBSetsWon++;
    }
  }

  const teamAWon =
    match.status === "COMPLETED" && teamASetsWon > teamBSetsWon;
  const teamBWon =
    match.status === "COMPLETED" && teamBSetsWon > teamASetsWon;

  const date = formatDisplayDate(match.createdAt);

  const handleSaveScore = (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => {
    updateScore.mutate({ setNumber, teamAScore, teamBScore });
  };

  const canComplete = () => {
    const requiredWins = Math.ceil(match.totalSets / 2);
    return teamASetsWon >= requiredWins || teamBSetsWon >= requiredWins;
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Suspense
            fallback={
              <Link href="/matches" className="p-1" aria-label="Back">
                <ArrowLeft size={22} className="text-text-primary" />
              </Link>
            }
          >
            <MatchBackLink fallbackHref="/matches" />
          </Suspense>
          <div>
            <h1 className="text-lg font-bold">Match Details</h1>
            <p className="text-xs text-neutral">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {match.isFriendly && (
            <span className="inline-flex items-center text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2.5 py-1">
              Friendly
            </span>
          )}
          <StatusBadge status={match.status} />
        </div>
      </div>

      <div className="px-4 pt-4">
        {match.tournamentContext && (
          <Link
            href={`/tournaments/${match.tournamentContext.id}`}
            className="flex items-stretch gap-3 bg-surface rounded-xl border border-border p-4 mb-6 active:scale-[0.99] transition-transform shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
              <Medal size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral mb-0.5">
                Tournament
              </p>
              <p className="text-base font-semibold text-text-primary truncate">
                {match.tournamentContext.name}
              </p>
              <p className="text-xs text-neutral mt-1.5">
                {match.tournamentContext.format} ·{" "}
                {match.tournamentContext.matchType} ·{" "}
                {match.tournamentContext.teamCount} teams
              </p>
              <p className="text-xs text-neutral mt-0.5">
                Bracket: round {match.tournamentContext.round} · match{" "}
                {match.tournamentContext.position + 1}
              </p>
              <p className="text-xs font-medium text-primary mt-2 flex items-center gap-0.5">
                Open tournament
                <ChevronRight size={14} className="shrink-0" />
              </p>
            </div>
            <div className="shrink-0 self-start pt-0.5">
              <StatusBadge status={match.tournamentContext.status} />
            </div>
          </Link>
        )}

        <div className="bg-surface rounded-xl border-2 border-border p-4 mb-6">
          <div
            className={`rounded-lg p-3 mb-2 ${
              teamAWon ? "border-2 border-success bg-green-50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                {participantNameRow(teamA, teamAWon)}
                <p className="text-xs text-neutral">
                  Rating:{" "}
                  {Math.round(
                    teamA.reduce((s, p) => s + p.player.rating, 0) /
                      teamA.length
                  )}
                </p>
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {teamASetsWon}
              </span>
            </div>
          </div>
          <div
            className={`rounded-lg p-3 ${
              teamBWon ? "border-2 border-success bg-green-50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                {participantNameRow(teamB, teamBWon)}
                <p className="text-xs text-neutral">
                  Rating:{" "}
                  {Math.round(
                    teamB.reduce((s, p) => s + p.player.rating, 0) /
                      teamB.length
                  )}
                </p>
              </div>
              <span className="text-3xl font-bold tabular-nums">
                {teamBSetsWon}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-3">Sets</h2>
        <div className="space-y-3 mb-6">
          {match.sets.map((set) => (
            <SetScoreRow
              key={set.id}
              setNumber={set.setNumber}
              teamAScore={set.teamAScore}
              teamBScore={set.teamBScore}
              pointsPerSet={match.pointsPerSet}
              teamAName={teamANames}
              teamBName={teamBNames}
              editable={match.status === "ONGOING"}
              isSaving={updateScore.isPending && savingSetRef.current === set.setNumber}
              onSaveScore={(a, b) =>
                handleSaveScore(set.setNumber, a, b)
              }
            />
          ))}
        </div>

        {match.status === "ONGOING" && canComplete() && (
          <Button
            fullWidth
            size="lg"
            onClick={() => completeMatch.mutate()}
            disabled={completeMatch.isPending}
            className="mb-6"
          >
            {completeMatch.isPending
              ? "Completing..."
              : "Complete Match"}
          </Button>
        )}

        {match.canDelete && (
          <Button
            fullWidth
            variant="secondary"
            size="lg"
            className="mb-6 border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => setDeleteMatchOpen(true)}
            disabled={deleteMatch.isPending}
          >
            {deleteMatch.isPending ? "Deleting..." : "Delete match"}
          </Button>
        )}

        <ConfirmDialog
          open={deleteMatchOpen}
          onClose={() => setDeleteMatchOpen(false)}
          title="Delete this match?"
          description="This match will be removed permanently. This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          isPending={deleteMatch.isPending}
          onConfirm={() => deleteMatch.mutate()}
        />

        <h2 className="text-lg font-bold mb-3">Event History</h2>
        <div className="space-y-0 mb-8">
          {match.eventLogs.map((log) => {
            const time = formatDisplayDate(log.createdAt);
            let description = log.action;
            const newVal = log.newValue as Record<string, unknown> | null;

            if (log.action === "COMPLETED") {
              description = "Match completed";
            } else if (log.action === "SCORE_UPDATED" && newVal) {
              description = `Set ${newVal.setNumber}: ${newVal.teamAScore}-${newVal.teamBScore}`;
            } else if (log.action === "CREATED") {
              description = "Match created";
            }

            return (
              <div
                key={log.id}
                className="flex gap-3 py-3 border-l-2 border-primary pl-4 ml-2"
              >
                <div>
                  <p className="text-sm font-medium">{description}</p>
                  <p className="text-xs text-neutral">
                    {time}
                    {log.updatedByUser?.name != null &&
                    log.updatedByUser.name.trim() !== ""
                      ? ` · ${log.updatedByUser.name}`
                      : " · Unknown"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
