import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/sync-neon-user";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      _count: { select: { matches: true, teams: true } },
      matches: {
        orderBy: { round: "desc" },
        take: 1,
        include: {
          winner: {
            include: {
              player1: {
                include: { user: { select: { name: true } } },
              },
              player2: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tournaments);
}

export async function POST(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, matchType, type: tournamentType } = body;

  const type =
    tournamentType === "ROUND_ROBIN" ? "ROUND_ROBIN" : "SINGLE_ELIMINATION";

  const tournament = await prisma.tournament.create({
    data: {
      name,
      matchType,
      type,
      createdBy: actor.prismaUserId,
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
