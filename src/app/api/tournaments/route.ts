import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
