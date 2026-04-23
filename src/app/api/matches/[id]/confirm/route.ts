import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { matchParticipantWithPlayerForApi } from "@/lib/match-participant-queries";
import { isActorOnOpposingTeam } from "@/lib/match-acceptance";
import { finalizeCompletedMatch } from "@/lib/finalize-completed-match";
import { notifyMatchCompletedResult } from "@/lib/match-notifications";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      participants: matchParticipantWithPlayerForApi,
      sets: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "AWAITING_CONFIRMATION") {
    return NextResponse.json(
      { error: "Match is not awaiting confirmation." },
      { status: 400 }
    );
  }

  const latestProposal = await prisma.eventLog.findFirst({
    where: { matchId: id, action: "COMPLETION_PROPOSED" },
    orderBy: { createdAt: "desc" },
    select: { updatedBy: true },
  });
  const proposerUserId = latestProposal?.updatedBy ?? match.createdBy;

  if (!isActorOnOpposingTeam(match.participants, actor.prismaUserId, proposerUserId)) {
    return NextResponse.json(
      { error: "Only the opposing team can confirm this match." },
      { status: 403 }
    );
  }

  const outcome = getCompletedMatchOutcome({
    sets: match.sets,
    totalSets: match.totalSets,
    pointsPerSet: match.pointsPerSet,
  });
  if (!outcome) {
    return NextResponse.json(
      { error: "Match has no decided result to confirm." },
      { status: 400 }
    );
  }

  const { winningTeam, teamAWins, teamBWins } = outcome;

  await prisma.match.update({
    where: { id },
    data: { status: "COMPLETED" },
  });

  await prisma.eventLog.create({
    data: {
      entityType: "Match",
      entityId: id,
      action: "COMPLETION_CONFIRMED",
      previousValue: { status: "AWAITING_CONFIRMATION" },
      newValue: {
        status: "COMPLETED",
        winningTeam,
        teamAWins,
        teamBWins,
      },
      updatedBy: actor.prismaUserId,
      matchId: id,
    },
  });

  await finalizeCompletedMatch({
    matchId: id,
    actorUserId: actor.prismaUserId,
    isFriendly: match.isFriendly,
    winningTeam,
  });

  notifyMatchCompletedResult(
    match,
    winningTeam,
    teamAWins,
    teamBWins,
    actor.prismaUserId
  );

  return NextResponse.json({ success: true });
}
