-- CreateTable
CREATE TABLE "UserFavoriteDrill" (
    "userId" TEXT NOT NULL,
    "drillTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteDrill_pkey" PRIMARY KEY ("userId","drillTemplateId")
);

-- CreateIndex
CREATE INDEX "UserFavoriteDrill_userId_idx" ON "UserFavoriteDrill"("userId");

-- AddForeignKey
ALTER TABLE "UserFavoriteDrill" ADD CONSTRAINT "UserFavoriteDrill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteDrill" ADD CONSTRAINT "UserFavoriteDrill_drillTemplateId_fkey" FOREIGN KEY ("drillTemplateId") REFERENCES "DrillTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
