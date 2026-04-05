import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** API routes: session → Prisma user id for `createdBy` and FKs. */
export async function getApiActor() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  await prisma.player.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  return {
    prismaUserId: user.id,
    email: user.email,
    name: user.name,
  };
}
