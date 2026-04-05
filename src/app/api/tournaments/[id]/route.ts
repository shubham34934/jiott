import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import { TOURNAMENTS_LIST_CACHE_TAG } from "@/lib/get-tournaments-list";
import { ensureTournamentPlayableMatch } from "@/lib/ensureTournamentPlayableMatch";

const tournamentInclude = {
  winnerTeam: {
    include: {
      player1: {
        include: { user: { select: { name: true, image: true } } },
      },
      player2: {
        include: { user: { select: { name: true, image: true } } },
      },
    },
  },
  runnerUpTeam: {
    include: {
      player1: {
        include: { user: { select: { name: true, image: true } } },
      },
      player2: {
        include: { user: { select: { name: true, image: true } } },
      },
    },
  },
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
          sets: { orderBy: { setNumber: "asc" as const } },
        },
      },
    },
    orderBy: [
      { round: "asc" as const },
      { position: "asc" as const },
    ],
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let tournament = await prisma.tournament.findUnique({
    where: { id },
    include: tournamentInclude,
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  const orphanSlots = tournament.matches.filter(
    (m) =>
      !m.matchId &&
      m.teamAId &&
      m.teamBId &&
      (m.status === "READY" || m.status === "ONGOING")
  );

  for (const tm of orphanSlots) {
    try {
      await ensureTournamentPlayableMatch(tm.id, tournament.createdBy);
    } catch {
      /* one bad slot should not break the whole page */
    }
  }

  if (orphanSlots.length > 0) {
    const refreshed = await prisma.tournament.findUnique({
      where: { id },
      include: tournamentInclude,
    });
    if (refreshed) {
      tournament = refreshed;
    }
  }

  const actor = await getApiActor();
  const canDelete = actor?.prismaUserId === tournament.createdBy;

  return NextResponse.json({ ...tournament, canDelete });
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

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, createdBy: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  if (tournament.createdBy !== actor.prismaUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tms = await prisma.tournamentMatch.findMany({
    where: { tournamentId: id },
    select: { matchId: true },
  });
  const matchIds = [
    ...new Set(
      tms.map((t) => t.matchId).filter((mid): mid is string => mid != null)
    ),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.updateMany({
      where: { tournamentId: id },
      data: { matchId: null },
    });
    if (matchIds.length > 0) {
      await tx.match.deleteMany({
        where: { id: { in: matchIds } },
      });
    }
    await tx.tournament.delete({
      where: { id },
    });
  });

  revalidateTag(TOURNAMENTS_LIST_CACHE_TAG, "max");

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

    revalidateTag(TOURNAMENTS_LIST_CACHE_TAG, "max");

    return NextResponse.json(team);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
