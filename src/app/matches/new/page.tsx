"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, User, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";

type Step = 1 | 2 | 3 | 4;
type MatchType = "SINGLES" | "DOUBLES";

interface PlayerOption {
  id: string;
  rating: number;
  user: { name: string | null; image: string | null };
}

export default function NewMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [matchType, setMatchType] = useState<MatchType | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [totalSets, setTotalSets] = useState(3);
  const [pointsPerSet, setPointsPerSet] = useState(11);

  const { data: players } = useQuery<PlayerOption[]>({
    queryKey: ["players"],
    queryFn: () => fetch("/api/players").then((r) => r.json()),
  });

  const createMatch = useMutation({
    mutationFn: (data: {
      type: string;
      playerIds: string[];
      totalSets: number;
      pointsPerSet: number;
    }) =>
      fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      router.push(`/matches/${data.id}`);
    },
  });

  const requiredPlayers = matchType === "DOUBLES" ? 4 : 2;

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < requiredPlayers
        ? [...prev, id]
        : prev
    );
  };

  const handleStart = () => {
    if (!matchType) return;
    createMatch.mutate({
      type: matchType,
      playerIds: selectedPlayers,
      totalSets,
      pointsPerSet,
    });
  };

  const progress = (step / 4) * 100;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/" className="p-1">
          <ArrowLeft size={22} className="text-text-primary" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">New Match</h1>
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
            <h2 className="text-xl font-bold mb-2">Choose match type</h2>
            <p className="text-sm text-neutral mb-6">
              Select the type of match
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setMatchType("SINGLES");
                  setSelectedPlayers([]);
                  setStep(2);
                }}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  matchType === "SINGLES"
                    ? "border-primary bg-blue-50"
                    : "border-border bg-surface"
                }`}
              >
                <User size={32} className="text-neutral" />
                <span className="font-semibold text-sm">Singles</span>
              </button>
              <button
                onClick={() => {
                  setMatchType("DOUBLES");
                  setSelectedPlayers([]);
                  setStep(2);
                }}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  matchType === "DOUBLES"
                    ? "border-primary bg-blue-50"
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
            <h2 className="text-xl font-bold mb-2">Select players</h2>
            <p className="text-sm text-neutral mb-1">
              Choose {requiredPlayers} players ({selectedPlayers.length}/
              {requiredPlayers} selected)
            </p>
            {matchType === "DOUBLES" && (
              <p className="text-xs text-neutral mb-4">
                First 2 = Team A, Last 2 = Team B
              </p>
            )}

            <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
              {players?.map((p) => {
                const selected = selectedPlayers.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-primary bg-blue-50"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          selected
                            ? "bg-primary text-white"
                            : "bg-background text-neutral"
                        }`}
                      >
                        {selectedPlayers.indexOf(p.id) + 1 || ""}
                      </div>
                      <span className="font-medium text-sm">
                        {p.user.name}
                      </span>
                    </div>
                    <span className="text-xs text-neutral">
                      Rating: {p.rating}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                fullWidth
                disabled={selectedPlayers.length !== requiredPlayers}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Match settings</h2>
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
                          ? "border-primary bg-blue-50 text-primary"
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
                          ? "border-primary bg-blue-50 text-primary"
                          : "border-border bg-surface text-text-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
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
            <h2 className="text-xl font-bold mb-2">Confirm match</h2>
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
              <hr className="border-border" />
              <div>
                <p className="text-xs text-neutral mb-2">Team A</p>
                {selectedPlayers
                  .slice(0, matchType === "DOUBLES" ? 2 : 1)
                  .map((id) => {
                    const p = players?.find((pl) => pl.id === id);
                    return (
                      <p key={id} className="text-sm font-medium">
                        {p?.user.name}
                      </p>
                    );
                  })}
              </div>
              <div>
                <p className="text-xs text-neutral mb-2">Team B</p>
                {selectedPlayers
                  .slice(matchType === "DOUBLES" ? 2 : 1)
                  .map((id) => {
                    const p = players?.find((pl) => pl.id === id);
                    return (
                      <p key={id} className="text-sm font-medium">
                        {p?.user.name}
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
