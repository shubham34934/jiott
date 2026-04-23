import { auth } from "@/auth";

/**
 * API routes: read the current actor straight from the JWT session.
 * No DB calls on the hot path; player rows are created at sign-up / sign-in.
 */
export async function getApiActor() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    prismaUserId: user.id,
    playerId: user.playerId ?? null,
    email: user.email ?? null,
    name: user.name ?? null,
  };
}
