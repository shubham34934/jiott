"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, User, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { fetchPlayersForPicker } from "@/lib/fetchPlayersForPicker";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

type Step = 1 | 2 | 3 | 4;

interface PlayerOption {
  id: string;
  rating: number;
  user: { name: string | null };
}

interface TeamEntry {
  player1Id: string;
  player2Id?: string;
  name: string;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<"SINGLES" | "DOUBLES">("SINGLES");
  const [tournamentType, setTournamentType] = useState<
    "SINGLE_ELIMINATION" | "ROUND_ROBIN"
  >("SINGLE_ELIMINATION");
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const { data: players } = useQuery<PlayerOption[]>({
    queryKey: ["players", "picker"],
    queryFn: () => fetchPlayersForPicker() as Promise<PlayerOption[]>,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const createTournament = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, matchType, type: tournamentType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create tournament");
      }
      const tournament = await res.json();

      for (const team of teams) {
        await fetch(`/api/tournaments/${tournament.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addTeam",
            playerIds: team.player2Id
              ? [team.player1Id, team.player2Id]
              : [team.player1Id],
          }),
        });
      }

      const bracketRes = await fetch(
        `/api/tournaments/${tournament.id}/bracket`,
        { method: "POST" }
      );
      if (!bracketRes.ok) {
        const err = await bracketRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate bracket");
      }

      return tournament;
    },
    onSuccess: (data) => {
      router.push(`/tournaments/${data.id}`);
    },
  });

  const addTeam = () => {
    if (matchType === "SINGLES" && selectedPlayers.length === 1) {
      const p = players?.find((pl) => pl.id === selectedPlayers[0]);
      setTeams((prev) => [
        ...prev,
        { player1Id: selectedPlayers[0], name: p?.user.name || "Unknown" },
      ]);
      setSelectedPlayers([]);
    } else if (matchType === "DOUBLES" && selectedPlayers.length === 2) {
      const p1 = players?.find((pl) => pl.id === selectedPlayers[0]);
      const p2 = players?.find((pl) => pl.id === selectedPlayers[1]);
      setTeams((prev) => [
        ...prev,
        {
          player1Id: selectedPlayers[0],
          player2Id: selectedPlayers[1],
          name: `${p1?.user.name || "?"} & ${p2?.user.name || "?"}`,
        },
      ]);
      setSelectedPlayers([]);
    }
  };

  const removeTeam = (index: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  };

  const usedPlayerIds = teams.flatMap((t) =>
    t.player2Id ? [t.player1Id, t.player2Id] : [t.player1Id]
  );

  const availablePlayers = players?.filter(
    (p) => !usedPlayerIds.includes(p.id)
  );

  const togglePlayer = (id: string) => {
    const limit = matchType === "DOUBLES" ? 2 : 1;
    setSelectedPlayers((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < limit
        ? [...prev, id]
        : prev
    );
  };

  const progress = (step / 4) * 100;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/" className="p-1">
          <ArrowLeft size={22} className="text-text-primary" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">New Tournament</h1>
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
            <h2 className="text-xl font-bold mb-2">Tournament details</h2>
            <p className="text-sm text-neutral mb-6">
              Give your tournament a name
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Tournament Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. March Madness 2026"
                className="w-full h-11 px-4 bg-surface border border-border rounded-xl text-sm placeholder:text-neutral-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <Button fullWidth disabled={!name.trim()} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Match type</h2>
            <p className="text-sm text-neutral mb-6">
              Singles or doubles tournament?
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => {
                  setMatchType("SINGLES");
                  setTeams([]);
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
                  setTeams([]);
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
            <p className="text-sm text-neutral mb-3">Bracket format</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setTournamentType("SINGLE_ELIMINATION")}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                  tournamentType === "SINGLE_ELIMINATION"
                    ? "border-primary bg-blue-50"
                    : "border-border bg-surface"
                }`}
              >
                <span className="font-semibold text-sm">Knockout</span>
                <span className="text-xs text-neutral leading-snug">
                  Single elimination until one winner
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTournamentType("ROUND_ROBIN")}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                  tournamentType === "ROUND_ROBIN"
                    ? "border-primary bg-blue-50"
                    : "border-border bg-surface"
                }`}
              >
                <span className="font-semibold text-sm">Round robin</span>
                <span className="text-xs text-neutral leading-snug">
                  Everyone plays everyone once
                </span>
              </button>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button fullWidth onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Add teams</h2>
            <p className="text-sm text-neutral mb-4">
              {teams.length} team{teams.length !== 1 ? "s" : ""} added
              (min 2)
            </p>

            {teams.length > 0 && (
              <div className="space-y-2 mb-4">
                {teams.map((team, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-surface border border-border rounded-xl p-3"
                  >
                    <span className="text-sm font-medium">{team.name}</span>
                    <button
                      onClick={() => removeTeam(i)}
                      className="text-xs text-danger font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-background rounded-xl p-4 mb-4">
              <p className="text-xs text-neutral mb-2 font-medium">
                Select {matchType === "DOUBLES" ? "2 players" : "a player"}{" "}
                for new team
              </p>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                {availablePlayers?.map((p) => {
                  const selected = selectedPlayers.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-sm ${
                        selected
                          ? "border-primary bg-blue-50"
                          : "border-border bg-surface"
                      }`}
                    >
                      <span className="font-medium">{p.user.name}</span>
                      <span className="text-xs text-neutral">{p.rating}</span>
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                className="mt-3"
                fullWidth
                disabled={
                  matchType === "SINGLES"
                    ? selectedPlayers.length !== 1
                    : selectedPlayers.length !== 2
                }
                onClick={addTeam}
              >
                Add Team
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                fullWidth
                disabled={teams.length < 2}
                onClick={() => setStep(4)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold mb-2">Confirm tournament</h2>
            <p className="text-sm text-neutral mb-6">Review and generate bracket</p>

            {createTournament.isError && (
              <p className="text-sm text-red-600 mb-4">
                {createTournament.error instanceof Error
                  ? createTournament.error.message
                  : "Something went wrong"}
              </p>
            )}

            <div className="bg-surface rounded-xl border border-border p-4 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Format</span>
                <span className="font-medium">
                  {tournamentType === "ROUND_ROBIN"
                    ? "Round robin"
                    : "Knockout"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Match Type</span>
                <span className="font-medium">{matchType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral">Teams</span>
                <span className="font-medium">{teams.length}</span>
              </div>
              <hr className="border-border" />
              {teams.map((team, i) => (
                <div key={i} className="text-sm">
                  <span className="text-neutral mr-2">#{i + 1}</span>
                  <span className="font-medium">{team.name}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                fullWidth
                onClick={() => createTournament.mutate()}
                disabled={createTournament.isPending}
              >
                {createTournament.isPending
                  ? "Generating..."
                  : "Generate Bracket"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
