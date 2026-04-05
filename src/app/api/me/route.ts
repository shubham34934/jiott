import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    return NextResponse.json(null);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { player: true },
  });
  if (!user) {
    return NextResponse.json(null);
  }

  let playerId = user.player?.id;
  if (!playerId) {
    const p = await prisma.player.create({
      data: { userId: user.id },
      select: { id: true },
    });
    playerId = p.id;
  }

  return NextResponse.json({
    id: user.id,
    playerId,
    name: user.name,
    email: user.email,
    image: user.image,
  });
}
