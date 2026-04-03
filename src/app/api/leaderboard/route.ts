import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.player.findMany({
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
  });

  return NextResponse.json(players);
}
