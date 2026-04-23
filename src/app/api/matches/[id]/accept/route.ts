import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { matchParticipantWithPlayerForApi } from "@/lib/match-participant-queries";
import { canResolveChallenge } from "@/lib/match-acceptance";
import { notifyChallengeResolved } from "@/lib/match-notifications";

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
  if (match.status !== "AWAITING_ACCEPTANCE") {
    return NextResponse.json(
      { error: "This challenge is no longer awaiting acceptance." },
      { status: 400 }
    );
  }
  if (!canResolveChallenge(match.participants, actor.prismaUserId, match.createdBy)) {
    return NextResponse.json(
      { error: "You can't accept this challenge." },
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
      action: "CHALLENGE_ACCEPTED",
      previousValue: { status: "AWAITING_ACCEPTANCE" },
      newValue: { status: "ONGOING" },
      updatedBy: actor.prismaUserId,
      matchId: id,
    },
  });

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");

  notifyChallengeResolved(match, actor.prismaUserId, actor.name, "accepted");

  return NextResponse.json({ success: true });
}
