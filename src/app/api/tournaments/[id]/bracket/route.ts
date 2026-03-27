import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBracket, getDependencies } from "@/lib/bracket";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  if (tournament.teams.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 teams" },
      { status: 400 }
    );
  }

  const teamIds = tournament.teams.map((t) => t.id);
  const bracketMatches = generateBracket(teamIds);

  const createdMatches: Record<string, string> = {};

  for (const bm of bracketMatches) {
    const isBye = bm.isBye;
    let status: "LOCKED" | "READY" | "COMPLETED" = "LOCKED";

    if (bm.round === 1 && bm.teamAId && bm.teamBId) {
      status = isBye ? "COMPLETED" : "READY";
    } else if (bm.round === 1 && (bm.teamAId || bm.teamBId)) {
      status = "COMPLETED";
    }

    const winnerId = isBye ? (bm.teamAId || bm.teamBId) : null;

    const tm = await prisma.tournamentMatch.create({
      data: {
        tournamentId: id,
        round: bm.round,
        position: bm.position,
        teamAId: bm.teamAId,
        teamBId: bm.teamBId,
        winnerId,
        status,
      },
    });

    createdMatches[`${bm.round}-${bm.position}`] = tm.id;
  }

  for (const bm of bracketMatches) {
    if (bm.round <= 1) continue;

    const deps = getDependencies(bm.round, bm.position);
    const matchId = createdMatches[`${bm.round}-${bm.position}`];

    for (const dep of deps) {
      const depMatchId = createdMatches[`${dep.round}-${dep.position}`];
      if (depMatchId) {
        await prisma.matchDependency.create({
          data: {
            matchId,
            dependsOnMatchId: depMatchId,
            slot: dep.slot,
          },
        });
      }
    }
  }

  for (const bm of bracketMatches) {
    if (bm.round === 1 && (bm.isBye || !bm.teamAId || !bm.teamBId)) {
      const tmId = createdMatches[`${bm.round}-${bm.position}`];
      const winnerId = bm.teamAId || bm.teamBId;

      if (winnerId) {
        const nextDeps = await prisma.matchDependency.findMany({
          where: { dependsOnMatchId: tmId },
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
    }
  }

  await prisma.tournament.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
  });

  return NextResponse.json({ success: true });
}
