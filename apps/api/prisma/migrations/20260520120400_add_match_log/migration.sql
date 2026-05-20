-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('player_win', 'opponent_win', 'draw', 'unknown');

-- CreateEnum
CREATE TYPE "MatchSource" AS ENUM ('manual', 'external');

-- CreateEnum
CREATE TYPE "FrameWinner" AS ENUM ('player', 'opponent', 'unknown');

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tournament" TEXT,
    "country" TEXT,
    "city" TEXT,
    "club" TEXT,
    "opponentName" TEXT NOT NULL,
    "opponentExternalId" TEXT,
    "round" TEXT,
    "format" TEXT,
    "framesWon" INTEGER NOT NULL DEFAULT 0,
    "framesLost" INTEGER NOT NULL DEFAULT 0,
    "highBreak" INTEGER,
    "breaks50" INTEGER NOT NULL DEFAULT 0,
    "breaks70" INTEGER NOT NULL DEFAULT 0,
    "breaks100" INTEGER NOT NULL DEFAULT 0,
    "decidingFrameResult" "FrameWinner",
    "safetySuccess" DOUBLE PRECISION,
    "longPotSuccess" DOUBLE PRECISION,
    "unforcedErrors" INTEGER,
    "tacticalErrors" INTEGER,
    "result" "MatchResult" NOT NULL DEFAULT 'unknown',
    "source" "MatchSource" NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "videoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchFrame" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "frameNumber" INTEGER NOT NULL,
    "playerScore" INTEGER,
    "opponentScore" INTEGER,
    "winner" "FrameWinner" NOT NULL DEFAULT 'unknown',
    "highBreak" INTEGER,
    "frameDurationSec" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchFrame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_playerProfileId_idx" ON "Match"("playerProfileId");

-- CreateIndex
CREATE INDEX "Match_createdByUserId_idx" ON "Match"("createdByUserId");

-- CreateIndex
CREATE INDEX "Match_matchDate_idx" ON "Match"("matchDate");

-- CreateIndex
CREATE INDEX "Match_opponentName_idx" ON "Match"("opponentName");

-- CreateIndex
CREATE INDEX "Match_result_idx" ON "Match"("result");

-- CreateIndex
CREATE UNIQUE INDEX "MatchFrame_matchId_frameNumber_key" ON "MatchFrame"("matchId", "frameNumber");

-- CreateIndex
CREATE INDEX "MatchFrame_matchId_idx" ON "MatchFrame"("matchId");

-- CreateIndex
CREATE INDEX "MatchFrame_winner_idx" ON "MatchFrame"("winner");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchFrame" ADD CONSTRAINT "MatchFrame_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
