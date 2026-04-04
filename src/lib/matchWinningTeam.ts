/**
 * Set-level win counting aligned with `completeMatch` in `/api/matches/[id]`.
 * Returns winning side and set counts, or null if the match is not decided.
 */
export function getCompletedMatchOutcome(match: {
  sets: Array<{ teamAScore: number; teamBScore: number }>;
  totalSets: number;
  pointsPerSet: number;
}): { winningTeam: "A" | "B"; teamAWins: number; teamBWins: number } | null {
  let teamAWins = 0;
  let teamBWins = 0;
  const target = match.pointsPerSet;

  for (const set of match.sets) {
    const a = set.teamAScore;
    const b = set.teamBScore;
    const winner = Math.max(a, b);
    const loser = Math.min(a, b);
    const isValid =
      winner >= target &&
      a !== b &&
      ((winner === target && loser < target - 1) ||
        (winner > target && loser >= target - 1 && winner - loser === 2));
    if (!isValid) continue;
    if (a > b) teamAWins++;
    else teamBWins++;
  }

  const requiredWins = Math.ceil(match.totalSets / 2);
  if (teamAWins < requiredWins && teamBWins < requiredWins) {
    return null;
  }
  const winningTeam = teamAWins > teamBWins ? "A" : "B";
  return { winningTeam, teamAWins, teamBWins };
}
