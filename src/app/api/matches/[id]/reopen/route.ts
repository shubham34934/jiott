import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { matchParticipantWithPlayerForApi } from "@/lib/match-participant-queries";
import { isActorOnOpposingTeam } from "@/lib/match-acceptance";
import { notifyCompletionReopened } from "@/lib/match-notifications";

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
    include: { participants: matchParticipantWithPlayerForApi },
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
      { error: "Only the opposing team can re-open this match." },
      { status: 403 }
    );
  }

  await prisma.match.update({
    where: { id },
    data: { status: "ONGOING" },
  });

  await prisma.eventLog.create({
    data: {
      entityType: "Match",
      entityId: id,
      action: "COMPLETION_REOPENED",
      previousValue: { status: "AWAITING_CONFIRMATION" },
      newValue: { status: "ONGOING" },
      updatedBy: actor.prismaUserId,
      matchId: id,
    },
  });

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");

  notifyCompletionReopened(match, actor.prismaUserId, actor.name);

  return NextResponse.json({ success: true });
}
