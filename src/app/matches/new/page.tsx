"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import {
  PlayerSearchInput,
  type PlayerOption,
} from "@/components/PlayerSearchInput";
import { fetchPlayersForPicker } from "@/lib/fetchPlayersForPicker";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

type Step = 1 | 2 | 3 | 4;
type MatchType = "SINGLES" | "DOUBLES";

export default function NewMatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [matchType, setMatchType] = useState<MatchType | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [totalSets, setTotalSets] = useState(3);
  const [pointsPerSet, setPointsPerSet] = useState(11);
  const [isFriendly, setIsFriendly] = useState(false);

  const { data: players } = useQuery<PlayerOption[]>({
    queryKey: ["players", "picker"],
    queryFn: () => fetchPlayersForPicker() as Promise<PlayerOption[]>,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const createMatch = useMutation({
    mutationFn: (data: {
      type: string;
      playerIds: string[];
      totalSets: number;
      pointsPerSet: number;
      isFriendly: boolean;
    }) =>
      fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      router.refresh();
      router.push(`/matches/${data.id}`);
    },
  });

  const requiredPlayers = matchType === "DOUBLES" ? 4 : 2;

  const setPlayerAtSlot = (index: number, playerId: string | null) => {
    setSelectedPlayers((prev) => {
      const next = [...prev];
      if (playerId === null) {
        next.splice(index, 1, "");
      } else {
        next[index] = playerId;
      }
      return next;
    });
  };

  const handleStart = () => {
    if (!matchType) return;
    createMatch.mutate({
      type: matchType,
      playerIds: selectedPlayers,
      totalSets,
      pointsPerSet,
      isFriendly,
    });
  };

  const progress = (step / 4) * 100;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-text-primary" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-text-primary">New Match</h1>
          <p className="text-xs text-neutral">Step {step} of 4</p>
        </div>
      </div>

      <div className="h-1 bg-border">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-4 pt-6">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-2 text-text-primary">Choose match type</h2>
            <p className="text-sm text-neutral mb-6">
              Select the type of match
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setMatchType("SINGLES");
                  setSelectedPlayers(["", ""]);
                  setStep(2);
                }}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  matchType === "SINGLES"
                    ? "border-primary bg-primary/12"
                    : "border-border bg-surface"
                }`}
              >
                <User size={32} className="text-neutral" />
                <span className="font-semibold text-sm">Singles</span>
              </button>
              <button
                onClick={() => {
                  setMatchType("DOUBLES");
                  setSelectedPlayers(["", "", "", ""]);
                  setStep(2);
                }}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  matchType === "DOUBLES"
                    ? "border-primary bg-primary/12"
                    : "border-border bg-surface"
                }`}
              >
                <Users size={32} className="text-neutral" />
                <span className="font-semibold text-sm">Doubles</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-2 text-text-primary">Select players</h2>
            <p className="text-sm text-neutral mb-6">
              Search and pick {requiredPlayers} players
            </p>

            <div className="space-y-4 mb-6">
              {matchType === "SINGLES" ? (
                <>
                  <PlayerSearchInput
                    label="Player 1 (Team A)"
                    players={players || []}
                    excludeIds={selectedPlayers.filter(Boolean)}
                    selectedId={selectedPlayers[0] || null}
                    onSelect={(id) => setPlayerAtSlot(0, id)}
                    onClear={() => setPlayerAtSlot(0, null)}
                  />
                  <PlayerSearchInput
                    label="Player 2 (Team B)"
                    players={players || []}
                    excludeIds={selectedPlayers.filter(Boolean)}
                    selectedId={selectedPlayers[1] || null}
                    onSelect={(id) => setPlayerAtSlot(1, id)}
                    onClear={() => setPlayerAtSlot(1, null)}
                  />
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-neutral uppercase tracking-wide">Team A</p>
                  <PlayerSearchInput
                    label="Team A — Player 1"
                    players={players || []}
                    excludeIds={selectedPlayers.filter(Boolean)}
                    selectedId={selectedPlayers[0] || null}
                    onSelect={(id) => setPlayerAtSlot(0, id)}
                    onClear={() => setPlayerAtSlot(0, null)}
                  />
                  <PlayerSearchInput
                    label="Team A — Player 2"
                    players={players || []}
                    excludeIds={selectedPlayers.filter(Boolean)}
                    selectedId={selectedPlayers[1] || null}
                    onSelect={(id) => setPlayerAtSlot(1, id)}
                    onClear={() => setPlayerAtSlot(1, null)}
                  />
                  <p className="text-xs font-semibold text-neutral uppercase tracking-wide pt-2">Team B</p>
                  <PlayerSearchInput
                    label="Team B — Player 1"
                    players={players || []}
                    excludeIds={selectedPlayers.filter(Boolean)}
                    selectedId={selectedPlayers[2] || null}
                    onSelect={(id) => setPlayerAtSlot(2, id)}
                    onClear={() => setPlayerAtSlot(2, null)}
                  />
                  <PlayerSearchInput
                    label="Team B — Player 2"
                    players={players || []}
                    excludeIds={selectedPlayers.filter(Boolean)}
                    selectedId={selectedPlayers[3] || null}
                    onSelect={(id) => setPlayerAtSlot(3, id)}
                    onClear={() => setPlayerAtSlot(3, null)}
                  />
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                fullWidth
                disabled={selectedPlayers.filter(Boolean).length !== requiredPlayers}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-2 text-text-primary">Match settings</h2>
            <p className="text-sm text-neutral mb-6">
              Configure the match rules
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number of Sets
                </label>
                <div className="flex gap-2">
                  {[1, 3, 5, 7].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTotalSets(n)}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        totalSets === n
                          ? "border-primary bg-primary/12 text-primary"
                          : "border-border bg-surface text-text-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Points per Set
                </label>
                <div className="flex gap-2">
                  {[11, 15, 21].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPointsPerSet(n)}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        pointsPerSet === n
                          ? "border-primary bg-primary/12 text-primary"
                          : "border-border bg-surface text-text-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => setIsFriendly(!isFriendly)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isFriendly
                      ? "border-primary bg-primary/12"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">Friendly Match</p>
                    <p className="text-xs text-neutral">Ratings won&apos;t be affected</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-all relative ${
                    isFriendly ? "bg-primary" : "bg-border"
                  }`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-text-primary shadow-md transition-all ${
                      isFriendly ? "left-[22px]" : "left-0.5"
                    }`} />
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button fullWidth onClick={() => setStep(4)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold mb-2 text-text-primary">Confirm match</h2>
            <p className="text-sm text-neutral mb-6">
              Review and start the match
            </p>

            <div className="bg-surface rounded-xl border border-border p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Type</span>
                <span className="font-medium">{matchType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Sets</span>
                <span className="font-medium">Best of {totalSets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Points/Set</span>
                <span className="font-medium">{pointsPerSet}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Match Type</span>
                <span className={`font-medium ${isFriendly ? "text-primary" : ""}`}>
                  {isFriendly ? "Friendly" : "Ranked"}
                </span>
              </div>
              <hr className="border-border" />
              <div>
                <p className="text-xs text-neutral mb-2">Team A</p>
                {selectedPlayers
                  .slice(0, matchType === "DOUBLES" ? 2 : 1)
                  .map((pid) => {
                    const p = players?.find((pl) => pl.id === pid);
                    return (
                      <p key={pid} className="text-sm font-medium">
                        <Link
                          href={`/players/${pid}`}
                          className="text-inherit underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
                        >
                          {p?.user.name}
                        </Link>
                      </p>
                    );
                  })}
              </div>
              <div>
                <p className="text-xs text-neutral mb-2">Team B</p>
                {selectedPlayers
                  .slice(matchType === "DOUBLES" ? 2 : 1)
                  .map((pid) => {
                    const p = players?.find((pl) => pl.id === pid);
                    return (
                      <p key={pid} className="text-sm font-medium">
                        <Link
                          href={`/players/${pid}`}
                          className="text-inherit underline underline-offset-[3px] decoration-1 decoration-primary/45 hover:decoration-primary"
                        >
                          {p?.user.name}
                        </Link>
                      </p>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                fullWidth
                onClick={handleStart}
                disabled={createMatch.isPending}
              >
                {createMatch.isPending ? "Starting..." : "Start Match"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
