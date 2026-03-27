export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export interface BracketSlot {
  round: number;
  position: number;
  teamId: string | null;
  isBye: boolean;
}

export interface BracketMatch {
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  isBye: boolean;
}

export function generateBracket(teamIds: string[]): BracketMatch[] {
  const totalSlots = nextPowerOf2(teamIds.length);
  const totalRounds = Math.log2(totalSlots);
  const byeCount = totalSlots - teamIds.length;

  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

  const matches: BracketMatch[] = [];

  const round1Matches = totalSlots / 2;
  let teamIndex = 0;

  for (let pos = 0; pos < round1Matches; pos++) {
    const teamA = teamIndex < shuffled.length ? shuffled[teamIndex++] : null;
    const teamB = teamIndex < shuffled.length ? shuffled[teamIndex++] : null;

    const isBye = teamA === null || teamB === null;

    matches.push({
      round: 1,
      position: pos,
      teamAId: teamA,
      teamBId: teamB,
      isBye,
    });
  }

  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = totalSlots / Math.pow(2, round);
    for (let pos = 0; pos < matchCount; pos++) {
      matches.push({
        round,
        position: pos,
        teamAId: null,
        teamBId: null,
        isBye: false,
      });
    }
  }

  return matches;
}

export function getDependencies(
  round: number,
  position: number
): { round: number; position: number; slot: "A" | "B" }[] {
  if (round <= 1) return [];

  return [
    { round: round - 1, position: position * 2, slot: "A" },
    { round: round - 1, position: position * 2 + 1, slot: "B" },
  ];
}
