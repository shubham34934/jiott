import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    return NextResponse.json(null, { headers: JSON_NO_STORE_HEADERS });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { player: true },
  });
  if (!user) {
    return NextResponse.json(null, { headers: JSON_NO_STORE_HEADERS });
  }

  let playerId = user.player?.id;
  if (!playerId) {
    const p = await prisma.player.create({
      data: { userId: user.id },
      select: { id: true },
    });
    playerId = p.id;
  }

  return NextResponse.json(
    {
      id: user.id,
      playerId,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    { headers: JSON_NO_STORE_HEADERS }
  );
}
