import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, image: true } },
      matchParticipations: {
        include: {
          match: {
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
            },
          },
        },
        orderBy: { match: { createdAt: "desc" } },
        take: 20,
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(player);
}
