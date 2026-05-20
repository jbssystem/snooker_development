-- CreateEnum
CREATE TYPE "AiReportType" AS ENUM ('weekly_summary');

-- CreateEnum
CREATE TYPE "AiReportStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "AiReport" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reportType" "AiReportType" NOT NULL DEFAULT 'weekly_summary',
    "status" "AiReportStatus" NOT NULL DEFAULT 'queued',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "title" TEXT,
    "contentMarkdown" TEXT,
    "sourceDataHash" TEXT NOT NULL,
    "sourceDataJson" JSONB NOT NULL,
    "dataSourcesJson" JSONB NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiReport_playerProfileId_idx" ON "AiReport"("playerProfileId");

-- CreateIndex
CREATE INDEX "AiReport_requestedByUserId_idx" ON "AiReport"("requestedByUserId");

-- CreateIndex
CREATE INDEX "AiReport_reportType_idx" ON "AiReport"("reportType");

-- CreateIndex
CREATE INDEX "AiReport_status_idx" ON "AiReport"("status");

-- CreateIndex
CREATE INDEX "AiReport_periodStart_idx" ON "AiReport"("periodStart");

-- CreateIndex
CREATE INDEX "AiReport_periodEnd_idx" ON "AiReport"("periodEnd");

-- CreateIndex
CREATE INDEX "AiReport_createdAt_idx" ON "AiReport"("createdAt");

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;