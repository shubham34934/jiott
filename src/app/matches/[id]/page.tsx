"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SetScoreRow } from "@/components/SetScoreRow";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";

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
  createdAt: string;
}

interface MatchData {
  id: string;
  type: string;
  status: "ONGOING" | "COMPLETED" | "DISPUTED";
  totalSets: number;
  pointsPerSet: number;
  participants: Participant[];
  sets: SetData[];
  eventLogs: EventLogEntry[];
  createdAt: string;
}

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [pendingScores, setPendingScores] = useState<
    Record<number, { teamAScore: number; teamBScore: number }>
  >({});

  const { data: match, isLoading } = useQuery<MatchData>({
    queryKey: ["match", id],
    queryFn: () => fetch(`/api/matches/${id}`).then((r) => r.json()),
  });

  const updateScore = useMutation({
    mutationFn: (data: {
      setNumber: number;
      teamAScore: number;
      teamBScore: number;
    }) =>
      fetch(`/api/matches/${id}/sets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
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
    .map((p) => p.player.user.name || "Unknown")
    .join(" & ");
  const teamBNames = teamB
    .map((p) => p.player.user.name || "Unknown")
    .join(" & ");

  let teamASetsWon = 0;
  let teamBSetsWon = 0;
  for (const set of match.sets) {
    const scores = pendingScores[set.setNumber] || {
      teamAScore: set.teamAScore,
      teamBScore: set.teamBScore,
    };
    if (scores.teamAScore > scores.teamBScore) teamASetsWon++;
    else if (scores.teamBScore > scores.teamAScore) teamBSetsWon++;
  }

  const teamAWon =
    match.status === "COMPLETED" && teamASetsWon > teamBSetsWon;
  const teamBWon =
    match.status === "COMPLETED" && teamBSetsWon > teamASetsWon;

  const date = new Date(match.createdAt).toISOString().split("T")[0];

  const handleScoreChange = (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => {
    setPendingScores((prev) => ({
      ...prev,
      [setNumber]: { teamAScore, teamBScore },
    }));
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
          <Link href="/matches" className="p-1">
            <ArrowLeft size={22} className="text-text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Match Details</h1>
            <p className="text-xs text-neutral">{date}</p>
          </div>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="px-4 pt-4">
        <div className="bg-surface rounded-xl border-2 border-border p-4 mb-6">
          <div
            className={`rounded-lg p-3 mb-2 ${
              teamAWon ? "border-2 border-success bg-green-50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`font-semibold text-sm ${
                    teamAWon ? "text-success" : ""
                  }`}
                >
                  {teamANames}
                </p>
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
                <p
                  className={`font-semibold text-sm ${
                    teamBWon ? "text-success" : ""
                  }`}
                >
                  {teamBNames}
                </p>
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
          {match.sets.map((set) => {
            const scores = pendingScores[set.setNumber] || {
              teamAScore: set.teamAScore,
              teamBScore: set.teamBScore,
            };
            return (
              <SetScoreRow
                key={set.id}
                setNumber={set.setNumber}
                teamAScore={scores.teamAScore}
                teamBScore={scores.teamBScore}
                teamAName={teamANames}
                teamBName={teamBNames}
                editable={match.status === "ONGOING"}
                onScoreChange={(a, b) =>
                  handleScoreChange(set.setNumber, a, b)
                }
              />
            );
          })}
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

        <h2 className="text-lg font-bold mb-3">Event History</h2>
        <div className="space-y-0 mb-8">
          {match.eventLogs.map((log) => {
            const time = new Date(log.createdAt).toLocaleDateString();
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
                  <p className="text-xs text-neutral">{time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
