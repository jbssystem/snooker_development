-- AlterTable
ALTER TABLE "DrillTemplate" ADD COLUMN "hiddenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DrillTemplate_hiddenAt_idx" ON "DrillTemplate"("hiddenAt");
