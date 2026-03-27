import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
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
      _count: { select: { matches: true, teams: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tournaments);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, matchType } = body;

  const tournament = await prisma.tournament.create({
    data: {
      name,
      matchType,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
