const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateEloChange(
  winnerRating: number,
  loserRating: number
): { winnerNew: number; loserNew: number } {
  const expectedWin = expectedScore(winnerRating, loserRating);
  const expectedLose = expectedScore(loserRating, winnerRating);

  const winnerNew = Math.round(winnerRating + K_FACTOR * (1 - expectedWin));
  const loserNew = Math.round(loserRating + K_FACTOR * (0 - expectedLose));

  return { winnerNew, loserNew };
}

export function calculateTeamRating(ratings: number[]): number {
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
}
