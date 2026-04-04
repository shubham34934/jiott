import { NextResponse } from "next/server";
import { neonAuth } from "@/lib/neon-auth-server";
import { syncNeonUserToPrisma } from "@/lib/sync-neon-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: session } = await neonAuth.getSession();
  if (!session?.user?.email) {
    return NextResponse.json(null);
  }

  const u = session.user;
  const { user, player } = await syncNeonUserToPrisma({
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
  });

  return NextResponse.json({
    id: user.id,
    playerId: player.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
  });
}
