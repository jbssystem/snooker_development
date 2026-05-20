-- CreateEnum
CREATE TYPE "TrainingSessionType" AS ENUM ('solo', 'coached', 'match_prep', 'review', 'other');

-- CreateEnum
CREATE TYPE "DrillAttemptResult" AS ENUM ('success', 'partial', 'miss', 'skipped');

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "sessionType" "TrainingSessionType" NOT NULL DEFAULT 'solo',
    "title" TEXT NOT NULL,
    "goal" TEXT,
    "intensity" INTEGER,
    "fatigueBefore" INTEGER,
    "fatigueAfter" INTEGER,
    "focusLevel" INTEGER,
    "mood" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillExecution" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "drillTemplateId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "successes" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "maxRun" INTEGER,
    "averageScore" DOUBLE PRECISION,
    "resultJson" JSONB,
    "errorTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "coachNotes" TEXT,
    "playerNotes" TEXT,
    "tableLayoutSnapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrillExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillAttempt" (
    "id" TEXT NOT NULL,
    "drillExecutionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "result" "DrillAttemptResult" NOT NULL,
    "score" DOUBLE PRECISION,
    "potSuccess" BOOLEAN,
    "positionSuccess" BOOLEAN,
    "missType" TEXT,
    "errorTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "shotTimeMs" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrillAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSession_playerProfileId_idx" ON "TrainingSession"("playerProfileId");

-- CreateIndex
CREATE INDEX "TrainingSession_createdByUserId_idx" ON "TrainingSession"("createdByUserId");

-- CreateIndex
CREATE INDEX "TrainingSession_startedAt_idx" ON "TrainingSession"("startedAt");

-- CreateIndex
CREATE INDEX "TrainingSession_endedAt_idx" ON "TrainingSession"("endedAt");

-- CreateIndex
CREATE INDEX "DrillExecution_trainingSessionId_idx" ON "DrillExecution"("trainingSessionId");

-- CreateIndex
CREATE INDEX "DrillExecution_drillTemplateId_idx" ON "DrillExecution"("drillTemplateId");

-- CreateIndex
CREATE INDEX "DrillExecution_playerProfileId_idx" ON "DrillExecution"("playerProfileId");

-- CreateIndex
CREATE INDEX "DrillExecution_startedAt_idx" ON "DrillExecution"("startedAt");

-- CreateIndex
CREATE INDEX "DrillExecution_endedAt_idx" ON "DrillExecution"("endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DrillAttempt_drillExecutionId_attemptNumber_key" ON "DrillAttempt"("drillExecutionId", "attemptNumber");

-- CreateIndex
CREATE INDEX "DrillAttempt_drillExecutionId_idx" ON "DrillAttempt"("drillExecutionId");

-- CreateIndex
CREATE INDEX "DrillAttempt_createdAt_idx" ON "DrillAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillExecution" ADD CONSTRAINT "DrillExecution_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillExecution" ADD CONSTRAINT "DrillExecution_drillTemplateId_fkey" FOREIGN KEY ("drillTemplateId") REFERENCES "DrillTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillExecution" ADD CONSTRAINT "DrillExecution_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_drillExecutionId_fkey" FOREIGN KEY ("drillExecutionId") REFERENCES "DrillExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
