"use client";

interface SetScoreRowProps {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  teamAName?: string;
  teamBName?: string;
  editable?: boolean;
  onScoreChange?: (teamAScore: number, teamBScore: number) => void;
}

export function SetScoreRow({
  setNumber,
  teamAScore,
  teamBScore,
  teamAName,
  teamBName,
  editable = false,
  onScoreChange,
}: SetScoreRowProps) {
  const aWon = teamAScore > teamBScore && (teamAScore > 0 || teamBScore > 0);
  const bWon = teamBScore > teamAScore && (teamAScore > 0 || teamBScore > 0);

  const winnerLabel = aWon
    ? `${teamAName || "Team A"} won`
    : bWon
    ? `${teamBName || "Team B"} won`
    : null;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral font-medium">
          Set {setNumber}
        </span>
        {winnerLabel && (
          <span className="text-xs font-medium text-success bg-green-50 rounded-full px-2 py-0.5">
            {winnerLabel}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        {editable ? (
          <>
            <input
              type="number"
              min={0}
              value={teamAScore}
              onChange={(e) =>
                onScoreChange?.(parseInt(e.target.value) || 0, teamBScore)
              }
              className="w-16 h-12 text-center text-2xl font-bold bg-background rounded-lg border border-border"
            />
            <span className="text-xl text-neutral font-bold">-</span>
            <input
              type="number"
              min={0}
              value={teamBScore}
              onChange={(e) =>
                onScoreChange?.(teamAScore, parseInt(e.target.value) || 0)
              }
              className="w-16 h-12 text-center text-2xl font-bold bg-background rounded-lg border border-border"
            />
          </>
        ) : (
          <>
            <span className="text-3xl font-bold tabular-nums">
              {teamAScore}
            </span>
            <span className="text-xl text-neutral font-bold">-</span>
            <span className="text-3xl font-bold tabular-nums">
              {teamBScore}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
