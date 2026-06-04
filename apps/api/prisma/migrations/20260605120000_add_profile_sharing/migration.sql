-- CreateEnum
CREATE TYPE "MembershipRelationship" AS ENUM ('COACH', 'PARENT', 'GUEST');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'EDIT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ProfileMembership" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationship" "MembershipRelationship" NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEW',
    "canAccessWellness" BOOLEAN NOT NULL DEFAULT false,
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileInvitation" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "relationship" "MembershipRelationship" NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEW',
    "canAccessWellness" BOOLEAN NOT NULL DEFAULT false,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileMembership_userId_idx" ON "ProfileMembership"("userId");

-- CreateIndex
CREATE INDEX "ProfileMembership_playerProfileId_idx" ON "ProfileMembership"("playerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileMembership_playerProfileId_userId_key" ON "ProfileMembership"("playerProfileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileInvitation_tokenHash_key" ON "ProfileInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ProfileInvitation_playerProfileId_idx" ON "ProfileInvitation"("playerProfileId");

-- CreateIndex
CREATE INDEX "ProfileInvitation_email_idx" ON "ProfileInvitation"("email");

-- CreateIndex
CREATE INDEX "ProfileInvitation_status_idx" ON "ProfileInvitation"("status");

-- AddForeignKey
ALTER TABLE "ProfileMembership" ADD CONSTRAINT "ProfileMembership_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileMembership" ADD CONSTRAINT "ProfileMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileInvitation" ADD CONSTRAINT "ProfileInvitation_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
