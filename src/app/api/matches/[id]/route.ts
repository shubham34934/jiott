import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { LEADERBOARD_CACHE_TAG } from "@/lib/get-leaderboard";
import { PLAYERS_LIST_CACHE_TAG } from "@/lib/get-players-list";
import { getApiActor } from "@/lib/get-api-actor";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { applyReplayedRankedStats } from "@/lib/replay-ranked-stats";
import { ensureTournamentPlayableMatch } from "@/lib/ensureTournamentPlayableMatch";
import { syncTournamentCompletionAfterMatch } from "@/lib/syncTournamentCompletion";
import {
  matchParticipantWithPlayerForApi,
  mergeRankedRatingDeltasForMatch,
} from "@/lib/match-participant-queries";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

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

  return NextResponse.json(
    {
      ...match,
      eventLogs,
      tournamentContext,
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
    select: { id: true, createdBy: true, isFriendly: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.createdBy !== actor.prismaUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tournamentLink = await prisma.tournamentMatch.findFirst({
    where: { matchId: id },
    select: { id: true },
  });
  if (tournamentLink) {
    return NextResponse.json(
      {
        error:
          "This match is part of a tournament and cannot be deleted.",
      },
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
    return completeMatch(id, actor.prismaUserId);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function completeMatch(matchId: string, userId: string) {
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
  const losingTeam = winningTeam === "A" ? "B" : "A";

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "COMPLETED" },
  });

  if (!match.isFriendly) {
    await prisma.$transaction((tx) => applyReplayedRankedStats(tx), {
      timeout: 30_000,
      maxWait: 10_000,
    });
  }

  await prisma.eventLog.create({
    data: {
      entityType: "Match",
      entityId: matchId,
      action: "COMPLETED",
      previousValue: { status: "ONGOING" },
      newValue: {
        status: "COMPLETED",
        winningTeam,
        teamAWins,
        teamBWins,
      },
      updatedBy: userId,
      matchId,
    },
  });

  const tournamentMatch = await prisma.tournamentMatch.findFirst({
    where: { matchId },
  });

  if (tournamentMatch) {
    const winnerId =
      winningTeam === "A"
        ? tournamentMatch.teamAId
        : tournamentMatch.teamBId;

    await prisma.tournamentMatch.update({
      where: { id: tournamentMatch.id },
      data: { status: "COMPLETED", winnerId },
    });

    const nextDeps = await prisma.matchDependency.findMany({
      where: { dependsOnMatchId: tournamentMatch.id },
      include: { match: true },
    });

    for (const dep of nextDeps) {
      const updateData =
        dep.slot === "A"
          ? { teamAId: winnerId }
          : { teamBId: winnerId };

      await prisma.tournamentMatch.update({
        where: { id: dep.matchId },
        data: updateData,
      });

      const refreshed = await prisma.tournamentMatch.findUnique({
        where: { id: dep.matchId },
      });

      if (refreshed?.teamAId && refreshed?.teamBId) {
        await ensureTournamentPlayableMatch(refreshed.id, userId);
      }
    }

    await syncTournamentCompletionAfterMatch(tournamentMatch.id);
  }

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");
  revalidateTag(LEADERBOARD_CACHE_TAG, "max");
  revalidateTag(PLAYERS_LIST_CACHE_TAG, "max");

  return NextResponse.json({ success: true });
}
