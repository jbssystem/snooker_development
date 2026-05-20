-- CreateTable
CREATE TABLE "EquipmentProfile" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "cueName" TEXT,
    "cueWeight" DOUBLE PRECISION,
    "tipBrand" TEXT,
    "tipSize" DOUBLE PRECISION,
    "tipChangeDate" TIMESTAMP(3),
    "extension" TEXT,
    "chalk" TEXT,
    "notes" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentProfile_playerProfileId_idx" ON "EquipmentProfile"("playerProfileId");

-- CreateIndex
CREATE INDEX "EquipmentProfile_activeFrom_idx" ON "EquipmentProfile"("activeFrom");

-- CreateIndex
CREATE INDEX "EquipmentProfile_activeTo_idx" ON "EquipmentProfile"("activeTo");

-- AddForeignKey
ALTER TABLE "EquipmentProfile" ADD CONSTRAINT "EquipmentProfile_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
