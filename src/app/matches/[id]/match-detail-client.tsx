"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, Loader2, Medal, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { SetScoreRow } from "@/components/SetScoreRow";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { formatDisplayDate } from "@/lib/formatDisplayDate";
import { PlayerProfileLink } from "@/components/PlayerProfileLink";
import { RatingDeltaBadge } from "@/components/RatingDeltaBadge";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";
import { useAppSession } from "@/hooks/use-app-session";

interface Participant {
  team: "A" | "B";
  rankedRatingDelta?: number | null;
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
}

function ShareButton({ id, text }: { id: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/matches/${id}`;
    const shareData = { title: "JIotableTennis", text, url };
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };
    if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
      try {
        await nav.share(shareData);
        return;
      } catch {
        /* user cancelled → fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; nothing we can do gracefully */
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Share match"
      className="p-1.5 rounded-lg hover:bg-surface-raised/80 text-neutral hover:text-text-primary transition-colors"
    >
      {copied ? <Check size={18} className="text-success" /> : <Share2 size={18} />}
    </button>
  );
}

function MatchBackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="p-1"
      aria-label="Back"
    >
      <ArrowLeft size={22} className="text-text-primary" />
    </button>
  );
}

function participantNameRow(team: Participant[], won: boolean) {
  const cls = won
    ? "font-semibold text-sm text-success"
    : "font-semibold text-sm text-text-primary";
  return (
    <p className={cls}>
      {team.map((p, i) => (
        <span key={p.player.id}>
          {i > 0 ? " & " : null}
          <PlayerProfileLink
            playerId={p.player.id}
            className={
              won
                ? "text-inherit underline underline-offset-[3px] decoration-1 decoration-success/55 hover:decoration-success"
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

function MatchDetailSkeleton() {
  const teamCardCls =
    "rounded-lg p-3 flex items-center justify-between animate-pulse";
  const pillCls = "h-4 bg-border rounded";
  const setRowCls =
    "bg-surface border border-border rounded-xl h-16 animate-pulse";
  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <MatchBackLink />
          <div className="space-y-1.5">
            <div className="h-5 w-32 bg-border rounded animate-pulse" />
            <div className="h-3 w-20 bg-border rounded animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-20 bg-border rounded-full animate-pulse" />
      </div>

      <div className="px-4 pt-4">
        <div className="bg-surface rounded-xl border-2 border-border p-4 mb-6 space-y-2">
          <div className={teamCardCls}>
            <div className="flex-1 space-y-2">
              <div className={`${pillCls} w-32`} />
              <div className={`${pillCls} w-20`} />
            </div>
            <div className="h-8 w-8 bg-border rounded" />
          </div>
          <div className={teamCardCls}>
            <div className="flex-1 space-y-2">
              <div className={`${pillCls} w-32`} />
              <div className={`${pillCls} w-20`} />
            </div>
            <div className="h-8 w-8 bg-border rounded" />
          </div>
        </div>

        <div className="h-5 w-12 bg-border rounded animate-pulse mb-3" />
        <div className="space-y-3 mb-6">
          <div className={setRowCls} />
          <div className={setRowCls} />
          <div className={setRowCls} />
        </div>

        <div className="h-5 w-28 bg-border rounded animate-pulse mb-3" />
        <div className="space-y-3">
          <div className="h-10 bg-surface border border-border rounded animate-pulse" />
          <div className="h-10 bg-surface border border-border rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function MatchDetailPageClient({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useAppSession();
  const currentPlayerId = session?.user?.playerId ?? null;

  const { data: match, isLoading } = useQuery<MatchData>({
    queryKey: ["match", id],
    queryFn: () => apiGet(`/api/matches/${id}`).then((r) => r.json()),
    staleTime: QUERY_STALE_TIME_MS,
  });

  const updateScore = useMutation({
    mutationFn: async (data: {
      setNumber: number;
      teamAScore: number;
      teamBScore: number;
    }) => {
      const r = await fetch(`/api/matches/${id}/sets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await r.json()) as
        | SetData
        | { error?: string };
      if (!r.ok) {
        throw new Error(
          typeof (body as { error?: string }).error === "string"
            ? (body as { error: string }).error
            : "Failed to save score"
        );
      }
      return body as SetData;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["match", id] });
      const previous = queryClient.getQueryData<MatchData>(["match", id]);
      queryClient.setQueryData<MatchData>(["match", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          sets: old.sets.map((s) =>
            s.setNumber === vars.setNumber
              ? {
                  ...s,
                  teamAScore: vars.teamAScore,
                  teamBScore: vars.teamBScore,
                }
              : s
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["match", id], ctx.previous);
      }
    },
    onSuccess: (serverSet) => {
      queryClient.setQueryData<MatchData>(["match", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          sets: old.sets.map((s) =>
            s.setNumber === serverSet.setNumber
              ? {
                  ...s,
                  id: serverSet.id,
                  teamAScore: serverSet.teamAScore,
                  teamBScore: serverSet.teamBScore,
                }
              : s
          ),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["match", id] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.refresh();
    },
  });

  const completeMatch = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const body = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to complete match"
        );
      }
      return body;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["match", id] });
      const previous = queryClient.getQueryData<MatchData>(["match", id]);
      queryClient.setQueryData<MatchData>(["match", id], (old) => {
        if (!old || old.status !== "ONGOING") return old;
        return { ...old, status: "COMPLETED" };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["match", id], ctx.previous);
      }
    },
    onSuccess: () => {
      const m = queryClient.getQueryData<MatchData>(["match", id]);
      queryClient.invalidateQueries({ queryKey: ["match", id] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      if (m?.tournamentContext?.id) {
        queryClient.invalidateQueries({
          queryKey: ["tournament", m.tournamentContext.id],
        });
      }
      for (const p of m?.participants ?? []) {
        queryClient.invalidateQueries({ queryKey: ["player", p.player.id] });
      }
      router.refresh();
    },
  });

  if (isLoading || !match) {
    return <MatchDetailSkeleton />;
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

  const isParticipant =
    currentPlayerId != null &&
    match.participants.some((p) => p.player.id === currentPlayerId);

  const canShare = match.status === "COMPLETED";
  const shareText = `${teamANames} ${teamASetsWon}-${teamBSetsWon} ${teamBNames} — JIotableTennis`;

  return (
    <div>
      {completeMatch.isPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-5 border border-border shadow-lg">
            <Loader2
              size={32}
              className="animate-spin text-primary"
              aria-hidden
            />
            <p className="text-sm font-medium text-text-primary">
              Completing match...
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <MatchBackLink />
          <div>
            <h1 className="text-lg font-bold text-text-primary">Match Details</h1>
            <p className="text-xs text-neutral">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {match.isFriendly && (
            <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/15 rounded-full px-2.5 py-1">
              Friendly
            </span>
          )}
          <StatusBadge status={match.status} />
          {canShare && <ShareButton id={id} text={shareText} />}
        </div>
      </div>

      <div className="px-4 pt-4">
        {match.tournamentContext && (
          <Link
            href={`/tournaments/${match.tournamentContext.id}`}
            className="flex items-stretch gap-3 bg-surface rounded-xl border border-border p-4 mb-6 active:scale-[0.99] transition-transform shadow-sm ring-1 ring-white/[0.03]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
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
              teamAWon ? "border-2 border-success bg-success/12" : ""
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
                {match.status === "COMPLETED" &&
                  !match.isFriendly &&
                  teamA[0]?.rankedRatingDelta != null && (
                    <p className="mt-1.5">
                      <RatingDeltaBadge delta={teamA[0].rankedRatingDelta} />
                    </p>
                  )}
              </div>
              <span className="text-3xl font-bold tabular-nums text-text-primary">
                {teamASetsWon}
              </span>
            </div>
          </div>
          <div
            className={`rounded-lg p-3 ${
              teamBWon ? "border-2 border-success bg-success/12" : ""
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
                {match.status === "COMPLETED" &&
                  !match.isFriendly &&
                  teamB[0]?.rankedRatingDelta != null && (
                    <p className="mt-1.5">
                      <RatingDeltaBadge delta={teamB[0].rankedRatingDelta} />
                    </p>
                  )}
              </div>
              <span className="text-3xl font-bold tabular-nums text-text-primary">
                {teamBSetsWon}
              </span>
            </div>
          </div>
        </div>

        {(updateScore.isError || completeMatch.isError) && (
          <p className="text-sm text-danger mb-3" role="alert">
            {updateScore.isError && updateScore.error instanceof Error
              ? updateScore.error.message
              : completeMatch.error instanceof Error
                ? completeMatch.error.message
                : "Something went wrong"}
          </p>
        )}

        <h2 className="text-lg font-bold mb-3 text-text-primary">Sets</h2>
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
              editable={match.status === "ONGOING" && isParticipant}
              onSaveScore={(a, b) =>
                handleSaveScore(set.setNumber, a, b)
              }
            />
          ))}
        </div>

        {match.status === "ONGOING" && canComplete() && isParticipant && (
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

        <h2 className="text-lg font-bold mb-3 text-text-primary">Event History</h2>
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
                  <p className="text-sm font-medium text-text-primary">{description}</p>
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
