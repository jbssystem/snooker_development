-- CreateEnum
CREATE TYPE "ExternalSource" AS ENUM ('wst', 'cuetracker');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- AlterEnum
ALTER TYPE "AiReportType" ADD VALUE 'external_analysis';

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN "wstId" TEXT,
ADD COLUMN "cuetrackerId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "externalImportJobId" TEXT;

-- CreateTable
CREATE TABLE "ExternalPlayerLink" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "source" "ExternalSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "displayName" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalPlayerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalImportJob" (
    "id" TEXT NOT NULL,
    "externalPlayerLinkId" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "matchesImported" INTEGER NOT NULL DEFAULT 0,
    "matchesSkipped" INTEGER NOT NULL DEFAULT 0,
    "statsImported" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "logJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalPlayerLink_playerProfileId_idx" ON "ExternalPlayerLink"("playerProfileId");
CREATE INDEX "ExternalPlayerLink_source_idx" ON "ExternalPlayerLink"("source");
CREATE INDEX "ExternalPlayerLink_syncEnabled_idx" ON "ExternalPlayerLink"("syncEnabled");
CREATE UNIQUE INDEX "ExternalPlayerLink_playerProfileId_source_key" ON "ExternalPlayerLink"("playerProfileId", "source");

-- CreateIndex
CREATE INDEX "ExternalImportJob_externalPlayerLinkId_idx" ON "ExternalImportJob"("externalPlayerLinkId");
CREATE INDEX "ExternalImportJob_status_idx" ON "ExternalImportJob"("status");
CREATE INDEX "ExternalImportJob_createdAt_idx" ON "ExternalImportJob"("createdAt");

-- AddForeignKey
ALTER TABLE "ExternalPlayerLink" ADD CONSTRAINT "ExternalPlayerLink_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalImportJob" ADD CONSTRAINT "ExternalImportJob_externalPlayerLinkId_fkey" FOREIGN KEY ("externalPlayerLinkId") REFERENCES "ExternalPlayerLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
