import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          player1: {
            include: { user: { select: { name: true, image: true } } },
          },
          player2: {
            include: { user: { select: { name: true, image: true } } },
          },
        },
      },
      matches: {
        include: {
          teamA: {
            include: {
              player1: {
                include: { user: { select: { name: true } } },
              },
              player2: {
                include: { user: { select: { name: true } } },
              },
            },
          },
          teamB: {
            include: {
              player1: {
                include: { user: { select: { name: true } } },
              },
              player2: {
                include: { user: { select: { name: true } } },
              },
            },
          },
          winner: true,
          match: {
            include: {
              sets: { orderBy: { setNumber: "asc" } },
            },
          },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(tournament);
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
  const { action, playerIds } = body;

  if (action === "addTeam") {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "CREATED") {
      return NextResponse.json(
        { error: "Cannot add teams after tournament started" },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data: {
        tournamentId: id,
        player1Id: playerIds[0],
        player2Id: playerIds[1] || null,
      },
      include: {
        player1: {
          include: { user: { select: { name: true, image: true } } },
        },
        player2: {
          include: { user: { select: { name: true, image: true } } },
        },
      },
    });

    return NextResponse.json(team);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
