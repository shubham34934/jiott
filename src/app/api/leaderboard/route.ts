import { NextResponse } from "next/server";
import { getLeaderboardPlayersCached } from "@/lib/get-leaderboard";

export async function GET() {
  const players = await getLeaderboardPlayersCached();
  return NextResponse.json(players);
}
