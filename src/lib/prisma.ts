import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL?.trim();
  if (
    !url ||
    (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))
  ) {
    throw new Error(
      "DATABASE_URL must be set to a Neon Postgres URI (postgresql://… or postgres://…). " +
        "In Vercel: Project → Settings → Environment Variables → add DATABASE_URL for Production."
    );
  }
  const adapter = new PrismaNeonHTTP(url, {
    arrayMode: false,
    fullResults: true,
  });
  return new PrismaClient({ adapter } as never);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
