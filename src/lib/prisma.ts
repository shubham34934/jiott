import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForDb = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Neon over WebSockets (often :443). @prisma/adapter-pg + neon’s Pool breaks: PrismaPg uses
// `instanceof` against top-level `pg.Pool`, so it treats Neon’s Pool as config and spawns a
// broken tcp `pg.Pool` → “No database host or connection string…”.
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

function getPoolMax(): number {
  const raw = process.env.PRISMA_PG_POOL_MAX;
  if (raw !== undefined && raw !== "") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 1) return n;
  }
  return process.env.NODE_ENV === "production" ? 1 : 3;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL?.trim();
  if (
    !url ||
    (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))
  ) {
    throw new Error(
      "DATABASE_URL must be a Postgres URI (postgresql://… or postgres://…)."
    );
  }

  const adapter = new PrismaNeon({
    connectionString: url,
    max: getPoolMax(),
  });

  return new PrismaClient({ adapter } as never);
}

if (!globalForDb.prisma) {
  globalForDb.prisma = createPrismaClient();
}

export const prisma = globalForDb.prisma;
