-- CreateEnum
CREATE TYPE "DrillCategory" AS ENUM ('cue_action', 'potting', 'positional_play', 'break_building', 'safety', 'snooker_escape', 'tactical_play', 'match_simulation', 'pressure_training', 'mental_routine', 'custom');

-- CreateEnum
CREATE TYPE "DrillDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced', 'professional');

-- CreateEnum
CREATE TYPE "DrillVisibility" AS ENUM ('private', 'shared', 'system');

-- CreateTable
CREATE TABLE "DrillTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DrillCategory" NOT NULL,
    "difficulty" "DrillDifficulty" NOT NULL,
    "description" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "metricsSchemaJson" JSONB NOT NULL,
    "defaultTableLayoutJson" JSONB,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "visibility" "DrillVisibility" NOT NULL DEFAULT 'private',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrillTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrillTemplate_createdByUserId_idx" ON "DrillTemplate"("createdByUserId");

-- CreateIndex
CREATE INDEX "DrillTemplate_category_idx" ON "DrillTemplate"("category");

-- CreateIndex
CREATE INDEX "DrillTemplate_difficulty_idx" ON "DrillTemplate"("difficulty");

-- CreateIndex
CREATE INDEX "DrillTemplate_visibility_idx" ON "DrillTemplate"("visibility");

-- CreateIndex
CREATE INDEX "DrillTemplate_createdAt_idx" ON "DrillTemplate"("createdAt");

-- AddForeignKey
ALTER TABLE "DrillTemplate" ADD CONSTRAINT "DrillTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
