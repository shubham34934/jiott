-- AlterEnum: add acceptance/confirmation/declined states to MatchStatus.
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'AWAITING_ACCEPTANCE';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
