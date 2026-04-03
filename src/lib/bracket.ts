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

/**
 * Single elimination: first round has bs/2 slots. Of those, (n - bs/2) are real 1v1
 * games and (bs - n) are bye matches (one team advances). This avoids null–null pairings
 * when n is not a power of 2.
 */
export function generateBracket(teamIds: string[]): BracketMatch[] {
  const n = teamIds.length;
  const bs = nextPowerOf2(n);
  const totalRounds = Math.log2(bs);
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);

  const matches: BracketMatch[] = [];

  const round1Slots = bs / 2;
  const realPairCount = n - bs / 2;
  const byeMatchCount = bs - n;

  let teamIndex = 0;

  for (let pos = 0; pos < round1Slots; pos++) {
    if (pos < realPairCount) {
      const teamA = shuffled[teamIndex++];
      const teamB = shuffled[teamIndex++];
      matches.push({
        round: 1,
        position: pos,
        teamAId: teamA,
        teamBId: teamB,
        isBye: false,
      });
    } else {
      const teamA = shuffled[teamIndex++];
      matches.push({
        round: 1,
        position: pos,
        teamAId: teamA,
        teamBId: null,
        isBye: true,
      });
    }
  }

  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = bs / Math.pow(2, round);
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

/** Everyone plays everyone once. All matches are round 1 with distinct positions. */
export function generateRoundRobin(teamIds: string[]): BracketMatch[] {
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const matches: BracketMatch[] = [];
  let position = 0;
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      matches.push({
        round: 1,
        position: position++,
        teamAId: shuffled[i],
        teamBId: shuffled[j],
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
