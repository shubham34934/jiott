import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;
  const body = await req.json();
  const { setNumber, teamAScore, teamBScore } = body;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot update completed match" },
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

  await prisma.eventLog.create({
    data: {
      entityType: "Set",
      entityId: updatedSet.id,
      action: "SCORE_UPDATED",
      previousValue,
      newValue: { teamAScore, teamBScore, setNumber },
      updatedBy: session.user.id,
      matchId,
    },
  });

  return NextResponse.json(updatedSet);
}
