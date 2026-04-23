import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { getApiActor } from "@/lib/get-api-actor";
import { matchParticipantWithPlayerForApi } from "@/lib/match-participant-queries";
import { undoCompletedMatchSideEffects } from "@/lib/finalize-completed-match";
import { notifyCompletionReopened } from "@/lib/match-notifications";

export const maxDuration = 60;

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

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: matchParticipantWithPlayerForApi },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const actorPlayer = await prisma.player.findUnique({
    where: { userId: actor.prismaUserId },
    select: { id: true },
  });
  const isParticipant =
    !!actorPlayer &&
    match.participants.some((p) => p.playerId === actorPlayer.id);
  if (!isParticipant) {
    return NextResponse.json(
      { error: "Only match players can update scores." },
      { status: 403 }
    );
  }

  if (match.status === "AWAITING_ACCEPTANCE") {
    return NextResponse.json(
      { error: "Opponent hasn't accepted the challenge yet." },
      { status: 400 }
    );
  }
  if (match.status === "DECLINED") {
    return NextResponse.json(
      { error: "Match was declined." },
      { status: 400 }
    );
  }
  if (match.status === "DISPUTED") {
    return NextResponse.json(
      { error: "Match is disputed — resolve the dispute first." },
      { status: 400 }
    );
  }

  // In AWAITING_CONFIRMATION only the proposer may edit; the opposing team
  // must first "Re-open" if they disagree. This keeps the confirmation loop
  // clean (no ping-pong of re-proposals via score edits).
  if (match.status === "AWAITING_CONFIRMATION") {
    const lastProposal = await prisma.eventLog.findFirst({
      where: { matchId, action: "COMPLETION_PROPOSED" },
      orderBy: { createdAt: "desc" },
      select: { updatedBy: true },
    });
    const proposerUserId = lastProposal?.updatedBy ?? match.createdBy;
    if (proposerUserId !== actor.prismaUserId) {
      return NextResponse.json(
        {
          error:
            "Only the player who proposed completion can edit. Re-open the match first if the score is wrong.",
        },
        { status: 403 }
      );
    }
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

  const wasCompleted = match.status === "COMPLETED";
  const wasAwaitingConfirmation = match.status === "AWAITING_CONFIRMATION";

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

  // Editing a COMPLETED or AWAITING_CONFIRMATION match flips it back to
  // AWAITING_CONFIRMATION (re-proposed by this actor) and pings the opposing team.
  if (wasCompleted || wasAwaitingConfirmation) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "AWAITING_CONFIRMATION" },
    });
    await prisma.eventLog.create({
      data: {
        entityType: "Match",
        entityId: matchId,
        action: "COMPLETION_PROPOSED",
        previousValue: { status: match.status },
        newValue: { status: "AWAITING_CONFIRMATION" },
        updatedBy: actor.prismaUserId,
        matchId,
      },
    });
    if (wasCompleted) {
      // Un-count this match from the ranked stats until it's confirmed again.
      await undoCompletedMatchSideEffects(match.isFriendly);
    }
    notifyCompletionReopened(match, actor.prismaUserId, actor.name);
  }

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");

  return NextResponse.json(updatedSet);
}
