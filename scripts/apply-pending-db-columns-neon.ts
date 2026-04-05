/**
 * Applies column DDL using DATABASE_URL + @neondatabase/serverless (same path as the app).
 * Use when `prisma migrate deploy` cannot reach DIRECT_URL (:5432 blocked) but the dev server works.
 *
 * After running, sync migration history (so future `migrate deploy` does not re-apply and error):
 *   npx prisma migrate resolve --applied 20260405140000_add_player_win_streaks
 *   npx prisma migrate resolve --applied 20260405160000_add_match_participant_ranked_rating_delta
 *   # If Feedback was never applied either:
 *   npx prisma migrate resolve --applied 20260405120000_add_feedback
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url || (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))) {
  console.error("DATABASE_URL must be set to a Postgres URI.");
  process.exit(1);
}

async function main() {
  const sql = neon(url as string);

  await sql`ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "currentWinStreak" INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "bestWinStreak" INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE "MatchParticipant" ADD COLUMN IF NOT EXISTS "rankedRatingDelta" INTEGER`;

  await sql`
    DO $do$
    BEGIN
      CREATE TYPE "FeedbackCategory" AS ENUM ('GENERAL', 'BUG', 'FEATURE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $do$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "Feedback" (
      "id" TEXT NOT NULL,
      "category" "FeedbackCategory" NOT NULL DEFAULT 'GENERAL',
      "message" TEXT NOT NULL,
      "contactEmail" TEXT,
      "pagePath" TEXT,
      "userId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");
  `;

  await sql`
    DO $do$
    BEGIN
      ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $do$;
  `;

  console.log(
    "Applied pending columns/tables. If migrations were never recorded, run `prisma migrate resolve --applied …` for each matching folder under prisma/migrations (see script header)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
