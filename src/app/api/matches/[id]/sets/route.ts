import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/sync-neon-user";

function isValidSetScore(a: number, b: number, target: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || b < 0) return false;
  const winner = Math.max(a, b);
  const loser = Math.min(a, b);
  if (winner < target) return false;
  if (a === b) return false;
  if (winner === target && loser < target - 1) return true;
  if (winner > target && loser >= target - 1) return winner - loser === 2;
  return false;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;
  const body = await req.json();
  const { setNumber, teamAScore, teamBScore } = body;

  if (typeof teamAScore !== "number" || typeof teamBScore !== "number") {
    return NextResponse.json(
      { error: "Scores must be numbers." },
      { status: 400 }
    );
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot update completed match." },
      { status: 400 }
    );
  }

  if (!isValidSetScore(teamAScore, teamBScore, match.pointsPerSet)) {
    return NextResponse.json(
      {
        error: `Invalid score. Winner must reach ${match.pointsPerSet} points and lead by at least 2.`,
      },
      { status: 400 }
    );
  }

  const existingSet = await prisma.set.findUnique({
    where: { matchId_setNumber: { matchId, setNumber } },
  });

  if (!existingSet) {
    return NextResponse.json({ error: "Set not found" }, { status: 404 });
  }

  const previousValue = {
    teamAScore: existingSet.teamAScore,
    teamBScore: existingSet.teamBScore,
  };

  const updatedSet = await prisma.set.update({
    where: { matchId_setNumber: { matchId, setNumber } },
    data: { teamAScore, teamBScore },
  });

  const winner = teamAScore > teamBScore ? "A" : "B";

  await prisma.eventLog.create({
    data: {
      entityType: "Set",
      entityId: updatedSet.id,
      action: "SCORE_UPDATED",
      previousValue,
      newValue: { teamAScore, teamBScore, setNumber, winner },
      updatedBy: actor.prismaUserId,
      matchId,
    },
  });

  return NextResponse.json(updatedSet);
}
