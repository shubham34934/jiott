"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface SetScoreRowProps {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  pointsPerSet: number;
  teamAName?: string;
  teamBName?: string;
  editable?: boolean;
  isSaving?: boolean;
  onSaveScore?: (teamAScore: number, teamBScore: number) => void;
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

function getSetWinner(
  a: number,
  b: number,
  target: number
): "A" | "B" | null {
  if (!isValidSetScore(a, b, target)) return null;
  return a > b ? "A" : "B";
}

export function SetScoreRow({
  setNumber,
  teamAScore,
  teamBScore,
  pointsPerSet,
  teamAName,
  teamBName,
  editable = false,
  isSaving = false,
  onSaveScore,
}: SetScoreRowProps) {
  const isSaved = teamAScore > 0 || teamBScore > 0;
  const [inputA, setInputA] = useState(isSaved ? String(teamAScore) : "");
  const [inputB, setInputB] = useState(isSaved ? String(teamBScore) : "");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isSaved) {
      setInputA(String(teamAScore));
      setInputB(String(teamBScore));
      setDirty(false);
    }
  }, [teamAScore, teamBScore, isSaved]);

  const savedWinner = getSetWinner(teamAScore, teamBScore, pointsPerSet);
  const winnerLabel = savedWinner === "A"
    ? `${teamAName || "Team A"} won`
    : savedWinner === "B"
    ? `${teamBName || "Team B"} won`
    : null;

  const hasChanged =
    dirty ||
    (!isSaved && (inputA !== "" || inputB !== "")) ||
    (isSaved && (inputA !== String(teamAScore) || inputB !== String(teamBScore)));

  const handleSave = () => {
    const a = parseInt(inputA) || 0;
    const b = parseInt(inputB) || 0;

    if (inputA === "" || inputB === "") {
      setError("Enter scores for both teams.");
      return;
    }

    if (a < 0 || b < 0) {
      setError("Scores cannot be negative.");
      return;
    }

    if (!isValidSetScore(a, b, pointsPerSet)) {
      if (a === b) {
        setError("Scores cannot be tied.");
      } else if (Math.max(a, b) < pointsPerSet) {
        setError(`Winner must reach at least ${pointsPerSet} points.`);
      } else {
        setError(`At deuce, winner must lead by 2 points.`);
      }
      return;
    }

    setError("");
    setDirty(false);
    onSaveScore?.(a, b);
  };

  const handleInput = (setter: (v: string) => void, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setter(cleaned);
    setError("");
    setDirty(true);
  };

  return (
    <div className={`bg-surface rounded-xl border p-4 ${
      savedWinner && !hasChanged ? "border-success/40" : "border-border"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-neutral font-medium">Set {setNumber}</span>
        {winnerLabel && !hasChanged && (
          <span className="text-xs font-medium text-success bg-green-50 rounded-full px-2 py-0.5">
            {winnerLabel}
          </span>
        )}
      </div>

      {editable ? (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-neutral mb-1 truncate">{teamAName || "Team A"}</p>
              <input
                type="text"
                inputMode="numeric"
                placeholder="-"
                value={inputA}
                onChange={(e) => handleInput(setInputA, e.target.value)}
                className="w-full h-14 text-center text-3xl font-bold bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <span className="text-xl text-neutral font-bold mt-4">-</span>

            <div className="flex-1 text-center">
              <p className="text-[10px] text-neutral mb-1 truncate">{teamBName || "Team B"}</p>
              <input
                type="text"
                inputMode="numeric"
                placeholder="-"
                value={inputB}
                onChange={(e) => handleInput(setInputB, e.target.value)}
                className="w-full h-14 text-center text-3xl font-bold bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger mt-2 text-center">{error}</p>
          )}

          {hasChanged && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || inputA === "" || inputB === ""}
              aria-busy={isSaving}
              className="mt-3 w-full h-10 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Check size={16} aria-hidden />
              )}
              {isSaving ? "Saving..." : "Save Score"}
            </button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-neutral mb-1 truncate">{teamAName || "Team A"}</p>
            <span className={`text-3xl font-bold tabular-nums ${
              savedWinner === "A" ? "text-success" : ""
            }`}>
              {isSaved ? teamAScore : "-"}
            </span>
          </div>

          <span className="text-xl text-neutral font-bold mt-4">-</span>

          <div className="flex-1 text-center">
            <p className="text-[10px] text-neutral mb-1 truncate">{teamBName || "Team B"}</p>
            <span className={`text-3xl font-bold tabular-nums ${
              savedWinner === "B" ? "text-success" : ""
            }`}>
              {isSaved ? teamBScore : "-"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
