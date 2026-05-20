-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('training', 'tournament', 'match', 'travel', 'rest_day', 'illness', 'injury', 'equipment_change', 'coach_change', 'supplement_start', 'supplement_end', 'sleep_issue', 'school_workload', 'custom_factor');

-- CreateEnum
CREATE TYPE "CalendarEventSource" AS ENUM ('manual', 'external');

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "eventType" "CalendarEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "source" "CalendarEventSource" NOT NULL DEFAULT 'manual',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifestyleFactor" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "fatigue" INTEGER,
    "stress" INTEGER,
    "focus" INTEGER,
    "mood" TEXT,
    "illness" BOOLEAN NOT NULL DEFAULT false,
    "injury" BOOLEAN NOT NULL DEFAULT false,
    "travel" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifestyleFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementEvent" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dosageNote" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_playerProfileId_idx" ON "CalendarEvent"("playerProfileId");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdByUserId_idx" ON "CalendarEvent"("createdByUserId");

-- CreateIndex
CREATE INDEX "CalendarEvent_eventType_idx" ON "CalendarEvent"("eventType");

-- CreateIndex
CREATE INDEX "CalendarEvent_startAt_idx" ON "CalendarEvent"("startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_source_idx" ON "CalendarEvent"("source");

-- CreateIndex
CREATE UNIQUE INDEX "LifestyleFactor_playerProfileId_date_key" ON "LifestyleFactor"("playerProfileId", "date");

-- CreateIndex
CREATE INDEX "LifestyleFactor_playerProfileId_idx" ON "LifestyleFactor"("playerProfileId");

-- CreateIndex
CREATE INDEX "LifestyleFactor_date_idx" ON "LifestyleFactor"("date");

-- CreateIndex
CREATE INDEX "SupplementEvent_playerProfileId_idx" ON "SupplementEvent"("playerProfileId");

-- CreateIndex
CREATE INDEX "SupplementEvent_createdByUserId_idx" ON "SupplementEvent"("createdByUserId");

-- CreateIndex
CREATE INDEX "SupplementEvent_name_idx" ON "SupplementEvent"("name");

-- CreateIndex
CREATE INDEX "SupplementEvent_startDate_idx" ON "SupplementEvent"("startDate");

-- CreateIndex
CREATE INDEX "SupplementEvent_endDate_idx" ON "SupplementEvent"("endDate");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifestyleFactor" ADD CONSTRAINT "LifestyleFactor_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementEvent" ADD CONSTRAINT "SupplementEvent_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementEvent" ADD CONSTRAINT "SupplementEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;