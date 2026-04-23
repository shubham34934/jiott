import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { LEADERBOARD_CACHE_TAG } from "@/lib/get-leaderboard";
import { PLAYERS_LIST_CACHE_TAG } from "@/lib/get-players-list";
import { getApiActor } from "@/lib/get-api-actor";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { applyReplayedRankedStats } from "@/lib/replay-ranked-stats";
import {
  matchParticipantWithPlayerForApi,
  mergeRankedRatingDeltasForMatch,
} from "@/lib/match-participant-queries";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";
import { notifyCompletionProposed } from "@/lib/match-notifications";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const matchRaw = await prisma.match.findUnique({
    where: { id },
    include: {
      participants: matchParticipantWithPlayerForApi,
      sets: { orderBy: { setNumber: "asc" } },
      eventLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!matchRaw) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const match = await mergeRankedRatingDeltasForMatch(matchRaw);

  const tournamentSlot = await prisma.tournamentMatch.findFirst({
    where: { matchId: id },
    select: {
      round: true,
      position: true,
      tournament: {
        select: {
          id: true,
          name: true,
          type: true,
          matchType: true,
          status: true,
          _count: { select: { teams: true } },
        },
      },
    },
  });

  const tournamentContext = tournamentSlot
    ? {
        id: tournamentSlot.tournament.id,
        name: tournamentSlot.tournament.name,
        format:
          tournamentSlot.tournament.type === "ROUND_ROBIN"
            ? "Round robin"
            : "Knockout",
        matchType: tournamentSlot.tournament.matchType,
        status: tournamentSlot.tournament.status,
        teamCount: tournamentSlot.tournament._count.teams,
        round: tournamentSlot.round,
        position: tournamentSlot.position,
      }
    : null;

  const actorIds = [
    ...new Set(match.eventLogs.map((log) => log.updatedBy).filter(Boolean)),
  ];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const nameByUserId = new Map(actors.map((u) => [u.id, u.name]));

  const eventLogs = match.eventLogs.map((log) => ({
    ...log,
    updatedByUser: { name: nameByUserId.get(log.updatedBy) ?? null },
  }));

  // Latest proposer for "awaiting confirmation" state → used by the UI to
  // decide who's on the "confirm" side vs the "waiting" side.
  const latestProposal = match.eventLogs.find(
    (l) => l.action === "COMPLETION_PROPOSED"
  );
  const pendingActionBy = latestProposal?.updatedBy ?? match.createdBy;

  return NextResponse.json(
    {
      ...match,
      eventLogs,
      tournamentContext,
      pendingActionBy,
    },
    { headers: JSON_NO_STORE_HEADERS }
  );
}

export async function DELETE(
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
    select: { id: true, createdBy: true, isFriendly: true, status: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.createdBy !== actor.prismaUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    match.status !== "AWAITING_ACCEPTANCE" &&
    match.status !== "DECLINED"
  ) {
    return NextResponse.json(
      {
        error:
          "Match has already started — you can't delete it after acceptance.",
      },
      { status: 400 }
    );
  }

  const tournamentLink = await prisma.tournamentMatch.findFirst({
    where: { matchId: id },
    select: { id: true },
  });
  if (tournamentLink) {
    return NextResponse.json(
      { error: "This match is part of a tournament and cannot be deleted." },
      { status: 400 }
    );
  }

  const participantRows = await prisma.matchParticipant.findMany({
    where: { matchId: id },
    select: { playerId: true },
  });
  const deletedMatchPlayerIds = [
    ...new Set(participantRows.map((p) => p.playerId)),
  ];

  await prisma.match.delete({ where: { id } });

  await prisma.$transaction(
    (tx) =>
      applyReplayedRankedStats(tx, {
        alsoResetPlayerIds:
          match.isFriendly === false ? deletedMatchPlayerIds : undefined,
      }),
    { timeout: 30_000, maxWait: 10_000 }
  );

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");
  revalidateTag(LEADERBOARD_CACHE_TAG, "max");
  revalidateTag(PLAYERS_LIST_CACHE_TAG, "max");

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  if (action === "complete") {
    return proposeCompletion(id, actor.prismaUserId, actor.name);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function proposeCompletion(
  matchId: string,
  userId: string,
  actorName: string | null
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: matchParticipantWithPlayerForApi,
      sets: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const actorPlayer = await prisma.player.findUnique({
    where: { userId },
    select: { id: true },
  });
  const isParticipant =
    actorPlayer != null &&
    match.participants.some((p) => p.player.id === actorPlayer.id);
  if (!isParticipant) {
    return NextResponse.json(
      { error: "Only match players can complete this match." },
      { status: 403 }
    );
  }

  if (match.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Match already completed" },
      { status: 400 }
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

  const outcome = getCompletedMatchOutcome({
    sets: match.sets,
    totalSets: match.totalSets,
    pointsPerSet: match.pointsPerSet,
  });
  if (!outcome) {
    return NextResponse.json(
      { error: "Match is not yet decided" },
      { status: 400 }
    );
  }

  const { winningTeam, teamAWins, teamBWins } = outcome;

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
      newValue: {
        status: "AWAITING_CONFIRMATION",
        winningTeam,
        teamAWins,
        teamBWins,
      },
      updatedBy: userId,
      matchId,
    },
  });

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");

  notifyCompletionProposed(
    match,
    userId,
    actorName,
    winningTeam,
    teamAWins,
    teamBWins
  );

  return NextResponse.json({ success: true });
}
