import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TOURNAMENTS_LIST_CACHE_TAG } from "@/lib/get-tournaments-list";
import { getApiActor } from "@/lib/sync-neon-user";
import {
  generateBracket,
  generateRoundRobin,
  getDependencies,
} from "@/lib/bracket";
import { ensureTournamentPlayableMatch } from "@/lib/ensureTournamentPlayableMatch";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();
  if (!actor) {
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

  const existing = await prisma.tournamentMatch.count({
    where: { tournamentId: id },
  });
  if (existing > 0) {
    return NextResponse.json(
      { error: "Bracket already generated for this tournament" },
      { status: 400 }
    );
  }

  const teamIds = tournament.teams.map((t) => t.id);
  const isRoundRobin = tournament.type === "ROUND_ROBIN";

  const bracketMatches = isRoundRobin
    ? generateRoundRobin(teamIds)
    : generateBracket(teamIds);

  const createdMatches: Record<string, string> = {};

  for (const bm of bracketMatches) {
    const isBye = bm.isBye;
    let status: "LOCKED" | "READY" | "COMPLETED" = "LOCKED";

    if (isRoundRobin) {
      status = "READY";
    } else if (bm.round === 1 && bm.teamAId && bm.teamBId) {
      status = isBye ? "COMPLETED" : "READY";
    } else if (bm.round === 1 && (bm.teamAId || bm.teamBId)) {
      status = "COMPLETED";
    }

    const winnerId =
      !isRoundRobin && isBye ? (bm.teamAId || bm.teamBId) : null;

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

  if (!isRoundRobin) {
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
  }

  const playableWithoutMatch = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId: id,
      matchId: null,
      teamAId: { not: null },
      teamBId: { not: null },
      status: "READY",
    },
  });

  for (const tm of playableWithoutMatch) {
    await ensureTournamentPlayableMatch(tm.id, actor.prismaUserId);
  }

  await prisma.tournament.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
  });

  revalidateTag(TOURNAMENTS_LIST_CACHE_TAG, "max");

  return NextResponse.json({ success: true });
}
