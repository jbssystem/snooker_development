-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('match', 'sparring');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "matchType" "MatchType" NOT NULL DEFAULT 'match';

-- AlterTable
ALTER TABLE "MatchFrame" ADD COLUMN     "scoreEvents" JSONB;

-- CreateIndex
CREATE INDEX "Match_matchType_idx" ON "Match"("matchType");
