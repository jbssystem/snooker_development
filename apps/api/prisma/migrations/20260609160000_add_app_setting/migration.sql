-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'none',
    "model" TEXT,
    "visionModel" TEXT,
    "apiKeyCipher" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);
