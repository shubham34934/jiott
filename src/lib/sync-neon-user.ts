import { prisma } from "./prisma";
import { neonAuth } from "./neon-auth-server";

export type NeonSessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

/** Keeps Prisma `User` / `Player` in sync with Neon Auth (for ratings, matches, FKs). */
export async function syncNeonUserToPrisma(neonUser: NeonSessionUser) {
  const email = neonUser.email.toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      id: neonUser.id,
      email,
      name: neonUser.name,
      emailVerified: neonUser.emailVerified ? new Date() : null,
      password: null,
    },
    update: {
      name: neonUser.name,
      emailVerified: neonUser.emailVerified ? new Date() : null,
    },
  });

  await prisma.player.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  const player = await prisma.player.findUniqueOrThrow({
    where: { userId: user.id },
  });

  return { user, player };
}

/** Use in API routes: resolves Neon session and returns Prisma user id for `createdBy` / FKs. */
export async function getApiActor() {
  const { data: session } = await neonAuth.getSession();
  if (!session?.user?.email) return null;
  const nu = session.user;
  const { user } = await syncNeonUserToPrisma({
    id: nu.id,
    email: nu.email,
    name: nu.name,
    emailVerified: nu.emailVerified,
  });
  return {
    prismaUserId: user.id,
    email: user.email,
    name: user.name,
  };
}
