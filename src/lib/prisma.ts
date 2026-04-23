/**
 * Node.js runtime only: Neon pool + `ws` is not supported on Vercel Edge.
 * Keep Vercel and Neon in the same region (see PERFORMANCE.md / vercel.json).
 */
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

function isLocalOrPlainPg(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname;
    // Neon hosts always end with .neon.tech. Anything else (including
    // localhost / 127.0.0.1 / LAN IPs) should use the built-in Prisma driver.
    return !host.endsWith(".neon.tech");
  } catch {
    return true;
  }
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

  // For local / non-Neon Postgres, skip the Neon WebSocket adapter and let
  // Prisma's native driver talk to the DB over TCP:5432.
  if (isLocalOrPlainPg(url)) {
    return new PrismaClient();
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
