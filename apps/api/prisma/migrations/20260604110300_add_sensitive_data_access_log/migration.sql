-- CreateEnum
CREATE TYPE "SensitiveDataType" AS ENUM ('LIFESTYLE', 'SUPPLEMENT');

-- CreateEnum
CREATE TYPE "SensitiveDataAccessAction" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "SensitiveDataAccessLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "dataType" "SensitiveDataType" NOT NULL,
    "action" "SensitiveDataAccessAction" NOT NULL,
    "targetId" TEXT,
    "metadataJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveDataAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensitiveDataAccessLog_playerProfileId_idx" ON "SensitiveDataAccessLog"("playerProfileId");

-- CreateIndex
CREATE INDEX "SensitiveDataAccessLog_actorUserId_idx" ON "SensitiveDataAccessLog"("actorUserId");

-- CreateIndex
CREATE INDEX "SensitiveDataAccessLog_dataType_idx" ON "SensitiveDataAccessLog"("dataType");

-- CreateIndex
CREATE INDEX "SensitiveDataAccessLog_createdAt_idx" ON "SensitiveDataAccessLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SensitiveDataAccessLog" ADD CONSTRAINT "SensitiveDataAccessLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitiveDataAccessLog" ADD CONSTRAINT "SensitiveDataAccessLog_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
