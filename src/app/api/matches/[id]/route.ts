import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MATCH_LIST_CACHE_TAG } from "@/lib/get-matches-list";
import { LEADERBOARD_CACHE_TAG } from "@/lib/get-leaderboard";
import { PLAYERS_LIST_CACHE_TAG } from "@/lib/get-players-list";
import { getApiActor } from "@/lib/sync-neon-user";
import { calculateEloChange, calculateTeamRating } from "@/lib/elo";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { ensureTournamentPlayableMatch } from "@/lib/ensureTournamentPlayableMatch";
import { syncTournamentCompletionAfterMatch } from "@/lib/syncTournamentCompletion";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          player: {
            include: {
              user: { select: { name: true, image: true } },
            },
          },
        },
      },
      sets: { orderBy: { setNumber: "asc" } },
      eventLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

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

  const actor = await getApiActor();
  const canDelete = actor?.prismaUserId === match.createdBy;

  return NextResponse.json({
    ...match,
    eventLogs,
    tournamentContext,
    canDelete,
  });
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
    select: { id: true, createdBy: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.createdBy !== actor.prismaUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tournamentMatch.updateMany({
    where: { matchId: id },
    data: { matchId: null },
  });

  await prisma.match.delete({
    where: { id },
  });

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
      participants: { include: { player: true } },
      sets: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
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

  const winners = match.participants.filter((p) => p.team === winningTeam);
  const losers = match.participants.filter((p) => p.team === losingTeam);

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "COMPLETED" },
  });

  if (!match.isFriendly) {
    const winnerRatings = winners.map((w) => w.player.rating);
    const loserRatings = losers.map((l) => l.player.rating);

    const avgWinnerRating = calculateTeamRating(winnerRatings);
    const avgLoserRating = calculateTeamRating(loserRatings);

    const { winnerNew, loserNew } = calculateEloChange(
      avgWinnerRating,
      avgLoserRating
    );

    const winnerDelta = winnerNew - avgWinnerRating;
    const loserDelta = loserNew - avgLoserRating;

    for (const winner of winners) {
      const p = winner.player;
      const nextCurrent = p.currentWinStreak + 1;
      const nextBest = Math.max(p.bestWinStreak, nextCurrent);
      await prisma.player.update({
        where: { id: winner.playerId },
        data: {
          rating: { increment: winnerDelta },
          matchesPlayed: { increment: 1 },
          matchesWon: { increment: 1 },
          currentWinStreak: nextCurrent,
          bestWinStreak: nextBest,
        },
      });
    }

    for (const loser of losers) {
      await prisma.player.update({
        where: { id: loser.playerId },
        data: {
          rating: { increment: loserDelta },
          matchesPlayed: { increment: 1 },
          currentWinStreak: 0,
        },
      });
    }
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
