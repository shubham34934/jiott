import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateEloChange, calculateTeamRating } from "@/lib/elo";

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

  return NextResponse.json(match);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  if (action === "complete") {
    return completeMatch(id, session.user.id);
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

  let teamAWins = 0;
  let teamBWins = 0;

  for (const set of match.sets) {
    const a = set.teamAScore;
    const b = set.teamBScore;
    const target = match.pointsPerSet;
    const winner = Math.max(a, b);
    const loser = Math.min(a, b);
    const isValid =
      winner >= target &&
      a !== b &&
      ((winner === target && loser < target - 1) ||
        (winner > target && loser >= target - 1 && winner - loser === 2));
    if (!isValid) continue;
    if (a > b) teamAWins++;
    else teamBWins++;
  }

  const requiredWins = Math.ceil(match.totalSets / 2);
  if (teamAWins < requiredWins && teamBWins < requiredWins) {
    return NextResponse.json(
      { error: "Match is not yet decided" },
      { status: 400 }
    );
  }

  const winningTeam = teamAWins > teamBWins ? "A" : "B";
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
      await prisma.player.update({
        where: { id: winner.playerId },
        data: {
          rating: { increment: winnerDelta },
          matchesPlayed: { increment: 1 },
          matchesWon: { increment: 1 },
        },
      });
    }

    for (const loser of losers) {
      await prisma.player.update({
        where: { id: loser.playerId },
        data: {
          rating: { increment: loserDelta },
          matchesPlayed: { increment: 1 },
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

  const tournamentMatch = await prisma.tournamentMatch.findUnique({
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
        await prisma.tournamentMatch.update({
          where: { id: refreshed.id },
          data: { status: "READY" },
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
