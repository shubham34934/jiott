/**
 * Drops the entire MongoDB database referenced by DATABASE_URL.
 * Run: npx tsx scripts/wipe-db.ts
 * Then: npx prisma db push  (recreate collections from schema)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  await prisma.$runCommandRaw({ dropDatabase: 1 });
  console.log("OK: database dropped (empty). Run: npx prisma db push");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
