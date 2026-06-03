-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('release_note', 'announcement', 'maintenance');

-- CreateEnum
CREATE TYPE "AnnouncementSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'announcement',
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "version" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementDismissal" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_isPublished_idx" ON "Announcement"("isPublished");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_startsAt_idx" ON "Announcement"("startsAt");

-- CreateIndex
CREATE INDEX "Announcement_endsAt_idx" ON "Announcement"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementDismissal_announcementId_userId_key" ON "AnnouncementDismissal"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "AnnouncementDismissal_userId_idx" ON "AnnouncementDismissal"("userId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementDismissal" ADD CONSTRAINT "AnnouncementDismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementDismissal" ADD CONSTRAINT "AnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
