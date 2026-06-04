import { ForbiddenException, Injectable } from '@nestjs/common';
import { ErrorCodes, type AccessibleProfile, type MembershipRelationship } from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import type { ProfileContext } from './profile-context';

/** Default wellness access derived from the relationship at invite time. */
export function defaultWellnessAccess(relationship: MembershipRelationship): boolean {
  return relationship === 'COACH' || relationship === 'PARENT';
}

@Injectable()
export class ProfileAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the active cabinet for a request. When no profile is selected and
   * the user has no own cabinet yet, returns null (bootstrap) rather than
   * throwing — endpoints decide whether a cabinet is required.
   */
  async resolve(userId: string, activeProfileId?: string | null): Promise<ProfileContext | null> {
    if (activeProfileId) {
      return this.resolveForProfile(userId, activeProfileId);
    }
    const own = await this.prisma.playerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return own ? ownerContext(userId, own.id) : null;
  }

  private async resolveForProfile(userId: string, profileId: string): Promise<ProfileContext> {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true },
    });
    if (!profile) {
      throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.ProfileAccessDenied } });
    }
    if (profile.userId === userId) {
      return ownerContext(userId, profile.id);
    }
    const membership = await this.prisma.profileMembership.findUnique({
      where: { playerProfileId_userId: { playerProfileId: profileId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.ProfileAccessDenied } });
    }
    return {
      userId,
      profileId,
      isOwner: false,
      accessLevel: membership.accessLevel,
      canAccessWellness: membership.canAccessWellness,
      relationship: membership.relationship,
    };
  }

  /** Cabinets the user can act in: own profile (if any) plus shared ones. */
  async listAccessible(userId: string): Promise<AccessibleProfile[]> {
    const own = await this.prisma.playerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        user: { select: { displayName: true } },
      },
    });
    const memberships = await this.prisma.profileMembership.findMany({
      where: { userId },
      select: {
        accessLevel: true,
        canAccessWellness: true,
        relationship: true,
        playerProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            user: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result: AccessibleProfile[] = [];
    if (own) {
      result.push({
        profileId: own.id,
        displayName: profileName(own.firstName, own.lastName, own.user.displayName),
        avatar: own.avatar ?? null,
        isOwner: true,
        relationship: 'OWNER',
        accessLevel: 'EDIT',
        canAccessWellness: true,
      });
    }
    for (const m of memberships) {
      result.push({
        profileId: m.playerProfile.id,
        displayName: profileName(
          m.playerProfile.firstName,
          m.playerProfile.lastName,
          m.playerProfile.user.displayName,
        ),
        avatar: m.playerProfile.avatar ?? null,
        isOwner: false,
        relationship: m.relationship,
        accessLevel: m.accessLevel,
        canAccessWellness: m.canAccessWellness,
      });
    }
    return result;
  }
}

function ownerContext(userId: string, profileId: string): ProfileContext {
  return {
    userId,
    profileId,
    isOwner: true,
    accessLevel: 'EDIT',
    canAccessWellness: true,
    relationship: 'OWNER',
  };
}

function profileName(firstName: string, lastName: string, fallback: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || fallback;
}
