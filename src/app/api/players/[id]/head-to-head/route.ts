import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

type StreakSide = "me" | "them" | null;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: themId } = await params;
  const meId = new URL(req.url).searchParams.get("vs")?.trim() ?? "";

  if (!meId) {
    return NextResponse.json(
      { error: "Missing `vs` query param." },
      { status: 400 }
    );
  }
  if (meId === themId) {
    return NextResponse.json({
      meWins: 0,
      themWins: 0,
      total: 0,
      streak: { side: null, count: 0 },
      lastMatch: null,
    });
  }

  const raw = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      AND: [
        { participants: { some: { playerId: meId } } },
        { participants: { some: { playerId: themId } } },
      ],
    },
    select: {
      id: true,
      type: true,
      isFriendly: true,
      totalSets: true,
      pointsPerSet: true,
      createdAt: true,
      participants: { select: { playerId: true, team: true } },
      sets: {
        orderBy: { setNumber: "asc" },
        select: { teamAScore: true, teamBScore: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  type Row = {
    id: string;
    type: "SINGLES" | "DOUBLES";
    isFriendly: boolean;
    createdAt: Date;
    meWon: boolean;
    meSetsWon: number;
    themSetsWon: number;
  };
  const rows: Row[] = [];
  for (const m of raw) {
    const mePart = m.participants.find((p) => p.playerId === meId);
    const themPart = m.participants.find((p) => p.playerId === themId);
    if (!mePart || !themPart) continue;
    if (mePart.team === themPart.team) continue;

    const outcome = getCompletedMatchOutcome({
      sets: m.sets,
      totalSets: m.totalSets,
      pointsPerSet: m.pointsPerSet,
    });
    if (!outcome) continue;

    const { winningTeam, teamAWins, teamBWins } = outcome;
    const meSetsWon = mePart.team === "A" ? teamAWins : teamBWins;
    const themSetsWon = themPart.team === "A" ? teamAWins : teamBWins;
    rows.push({
      id: m.id,
      type: m.type as "SINGLES" | "DOUBLES",
      isFriendly: m.isFriendly,
      createdAt: m.createdAt,
      meWon: mePart.team === winningTeam,
      meSetsWon,
      themSetsWon,
    });
  }

  let meWins = 0;
  let themWins = 0;
  for (const r of rows) {
    if (r.meWon) meWins++;
    else themWins++;
  }

  let streakSide: StreakSide = null;
  let streakCount = 0;
  if (rows.length > 0) {
    streakSide = rows[0].meWon ? "me" : "them";
    for (const r of rows) {
      const side: StreakSide = r.meWon ? "me" : "them";
      if (side !== streakSide) break;
      streakCount++;
    }
  }

  const last = rows[0] ?? null;

  return NextResponse.json(
    {
      meWins,
      themWins,
      total: rows.length,
      streak: { side: streakSide, count: streakCount },
      lastMatch: last
        ? {
            id: last.id,
            createdAt: last.createdAt,
            type: last.type,
            isFriendly: last.isFriendly,
            meWon: last.meWon,
            meSetsWon: last.meSetsWon,
            themSetsWon: last.themSetsWon,
          }
        : null,
    },
    { headers: JSON_NO_STORE_HEADERS }
  );
}
