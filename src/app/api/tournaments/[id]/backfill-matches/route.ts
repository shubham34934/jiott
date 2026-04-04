import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/sync-neon-user";
import { ensureTournamentPlayableMatch } from "@/lib/ensureTournamentPlayableMatch";

/**
 * Idempotent: creates linked Match records for tournament slots that are playable
 * (both teams set, READY) but missing matchId — e.g. tournaments created before
 * auto-linking existed, or if ensure failed silently.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const slots = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId,
      matchId: null,
      teamAId: { not: null },
      teamBId: { not: null },
      status: "READY",
    },
  });

  let linked = 0;
  for (const tm of slots) {
    const beforeId = tm.id;
    await ensureTournamentPlayableMatch(beforeId, actor.prismaUserId);
    const after = await prisma.tournamentMatch.findUnique({
      where: { id: beforeId },
      select: { matchId: true },
    });
    if (after?.matchId) linked++;
  }

  return NextResponse.json({ success: true, linked });
}
