import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma, ProfileInvitation } from '@prisma/client';
import {
  ErrorCodes,
  type CreateInvitationInput,
  type IncomingInvitation,
  type InvitationPreview,
  type ProfileInvitationSummary,
  type ProfileMember,
  type UpdateMemberAccessInput,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import { EmailService } from '../email/email.service';
import { defaultWellnessAccess } from './profile-access.service';

const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@Injectable()
export class ProfileSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // --- Owner-side: members & invitations -----------------------------------

  async listMembers(profileId: string): Promise<ProfileMember[]> {
    const members = await this.prisma.profileMembership.findMany({
      where: { playerProfileId: profileId },
      include: { user: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName,
      email: m.user.email,
      avatar: null,
      relationship: m.relationship,
      accessLevel: m.accessLevel,
      canAccessWellness: m.canAccessWellness,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async listInvitations(profileId: string): Promise<ProfileInvitationSummary[]> {
    const invitations = await this.prisma.profileInvitation.findMany({
      where: { playerProfileId: profileId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(toInvitationSummary);
  }

  async invite(
    profileId: string,
    ownerUserId: string,
    input: CreateInvitationInput,
  ): Promise<ProfileInvitationSummary> {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { id: profileId },
      select: { firstName: true, lastName: true, user: { select: { displayName: true, email: true } } },
    });
    if (!profile) {
      throw new NotFoundException({ error: { code: ErrorCodes.Sharing.NoProfile } });
    }
    if (input.email === profile.user.email.toLowerCase()) {
      throw new BadRequestException({ error: { code: ErrorCodes.Sharing.CannotInviteSelf } });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingUser) {
      const member = await this.prisma.profileMembership.findUnique({
        where: { playerProfileId_userId: { playerProfileId: profileId, userId: existingUser.id } },
      });
      if (member) {
        throw new ConflictException({ error: { code: ErrorCodes.Sharing.AlreadyMember } });
      }
    }

    // Supersede any outstanding invite for this email so a fresh link is issued.
    await this.prisma.profileInvitation.updateMany({
      where: { playerProfileId: profileId, email: input.email, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    const rawToken = randomBytes(32).toString('hex');
    const canAccessWellness = input.canAccessWellness ?? defaultWellnessAccess(input.relationship);
    const invitation = await this.prisma.profileInvitation.create({
      data: {
        playerProfileId: profileId,
        email: input.email,
        relationship: input.relationship,
        accessLevel: input.accessLevel,
        canAccessWellness,
        tokenHash: hash(rawToken),
        invitedByUserId: ownerUserId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    const cabinetName = profileName(profile.firstName, profile.lastName, profile.user.displayName);
    if (existingUser) {
      await this.email.sendCabinetInvitationExisting(
        input.email,
        profile.user.displayName,
        cabinetName,
        this.acceptUrl(rawToken),
      );
    } else {
      await this.email.sendCabinetInvitationNew(
        input.email,
        profile.user.displayName,
        cabinetName,
        this.registerUrl(rawToken),
      );
    }

    return toInvitationSummary(invitation);
  }

  async revokeInvitation(profileId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.profileInvitation.findFirst({
      where: { id: invitationId, playerProfileId: profileId },
    });
    if (!invitation) {
      throw new NotFoundException({ error: { code: ErrorCodes.Sharing.InvitationInvalid } });
    }
    await this.prisma.profileInvitation.update({
      where: { id: invitation.id },
      data: { status: 'REVOKED' },
    });
  }

  async updateMember(
    profileId: string,
    memberUserId: string,
    input: UpdateMemberAccessInput,
  ): Promise<ProfileMember> {
    await this.findMembershipOrThrow(profileId, memberUserId);
    const data: Prisma.ProfileMembershipUpdateInput = {};
    if (input.accessLevel !== undefined) data.accessLevel = input.accessLevel;
    if (input.canAccessWellness !== undefined) data.canAccessWellness = input.canAccessWellness;
    await this.prisma.profileMembership.update({
      where: { playerProfileId_userId: { playerProfileId: profileId, userId: memberUserId } },
      data,
    });
    const [member] = await this.listMembersFor(profileId, memberUserId);
    return member!;
  }

  async removeMember(profileId: string, memberUserId: string): Promise<void> {
    await this.findMembershipOrThrow(profileId, memberUserId);
    await this.prisma.profileMembership.delete({
      where: { playerProfileId_userId: { playerProfileId: profileId, userId: memberUserId } },
    });
  }

  // --- Invitee-side: preview / accept / decline ----------------------------

  async preview(rawToken: string): Promise<InvitationPreview> {
    const invitation = await this.findByTokenOrThrow(rawToken);
    const profile = await this.prisma.playerProfile.findUnique({
      where: { id: invitation.playerProfileId },
      select: { firstName: true, lastName: true, user: { select: { displayName: true } } },
    });
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitation.invitedByUserId },
      select: { displayName: true },
    });
    const account = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    return {
      cabinetName: profile
        ? profileName(profile.firstName, profile.lastName, profile.user.displayName)
        : '',
      inviterName: inviter?.displayName ?? '',
      email: invitation.email,
      relationship: invitation.relationship,
      accessLevel: invitation.accessLevel,
      status: this.effectiveStatus(invitation),
      requiresRegistration: !account,
    };
  }

  /** Accept via the emailed token (the user may have just registered/logged in). */
  async acceptByToken(userId: string, rawToken: string): Promise<void> {
    const invitation = await this.findByTokenOrThrow(rawToken);
    await this.accept(userId, invitation);
  }

  async declineByToken(userId: string, rawToken: string): Promise<void> {
    const invitation = await this.findByTokenOrThrow(rawToken);
    await this.resolveDecline(userId, invitation);
  }

  async listIncomingForUser(userId: string): Promise<IncomingInvitation[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return [];
    return this.listIncoming(user.email);
  }

  /** Invitations addressed to the logged-in user's email, awaiting response. */
  async listIncoming(email: string): Promise<IncomingInvitation[]> {
    const invitations = await this.prisma.profileInvitation.findMany({
      where: { email: email.toLowerCase(), status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const profiles = await this.prisma.playerProfile.findMany({
      where: { id: { in: invitations.map((i) => i.playerProfileId) } },
      select: { id: true, firstName: true, lastName: true, user: { select: { displayName: true } } },
    });
    const byId = new Map(profiles.map((p) => [p.id, p]));
    return invitations.map((i) => {
      const p = byId.get(i.playerProfileId);
      return {
        id: i.id,
        cabinetName: p ? profileName(p.firstName, p.lastName, p.user.displayName) : '',
        inviterName: '',
        relationship: i.relationship,
        accessLevel: i.accessLevel,
        createdAt: i.createdAt.toISOString(),
      };
    });
  }

  async acceptById(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.profileInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) {
      throw new NotFoundException({ error: { code: ErrorCodes.Sharing.InvitationInvalid } });
    }
    await this.accept(userId, invitation);
  }

  async declineById(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.profileInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) {
      throw new NotFoundException({ error: { code: ErrorCodes.Sharing.InvitationInvalid } });
    }
    await this.resolveDecline(userId, invitation);
  }

  /**
   * Auto-accepts all pending invitations matching a freshly verified email.
   * Best-effort: a user who registered via an invite link implicitly consents.
   */
  async autoAcceptForEmail(userId: string, email: string): Promise<void> {
    const invitations = await this.prisma.profileInvitation.findMany({
      where: { email: email.toLowerCase(), status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    for (const invitation of invitations) {
      await this.createMembershipFromInvitation(userId, invitation);
    }
  }

  // --- Internals ------------------------------------------------------------

  private async accept(userId: string, invitation: ProfileInvitation): Promise<void> {
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException({ error: { code: ErrorCodes.Sharing.InvitationInvalid } });
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.profileInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException({ error: { code: ErrorCodes.Sharing.InvitationExpired } });
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.InvitationEmailMismatch } });
    }
    await this.createMembershipFromInvitation(userId, invitation);
  }

  private async resolveDecline(userId: string, invitation: ProfileInvitation): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.InvitationEmailMismatch } });
    }
    if (invitation.status === 'PENDING') {
      await this.prisma.profileInvitation.update({
        where: { id: invitation.id },
        data: { status: 'DECLINED' },
      });
    }
  }

  private async createMembershipFromInvitation(
    userId: string,
    invitation: ProfileInvitation,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.profileMembership.upsert({
        where: {
          playerProfileId_userId: { playerProfileId: invitation.playerProfileId, userId },
        },
        create: {
          playerProfileId: invitation.playerProfileId,
          userId,
          relationship: invitation.relationship,
          accessLevel: invitation.accessLevel,
          canAccessWellness: invitation.canAccessWellness,
          invitedByUserId: invitation.invitedByUserId,
        },
        update: {
          relationship: invitation.relationship,
          accessLevel: invitation.accessLevel,
          canAccessWellness: invitation.canAccessWellness,
        },
      }),
      this.prisma.profileInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedByUserId: userId, acceptedAt: new Date() },
      }),
    ]);
  }

  private async findMembershipOrThrow(profileId: string, userId: string) {
    const membership = await this.prisma.profileMembership.findUnique({
      where: { playerProfileId_userId: { playerProfileId: profileId, userId } },
    });
    if (!membership) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return membership;
  }

  private async listMembersFor(profileId: string, userId: string): Promise<ProfileMember[]> {
    const all = await this.listMembers(profileId);
    return all.filter((m) => m.userId === userId);
  }

  private async findByTokenOrThrow(rawToken: string): Promise<ProfileInvitation> {
    const invitation = await this.prisma.profileInvitation.findUnique({
      where: { tokenHash: hash(rawToken) },
    });
    if (!invitation) {
      throw new NotFoundException({ error: { code: ErrorCodes.Sharing.InvitationInvalid } });
    }
    return invitation;
  }

  private effectiveStatus(invitation: ProfileInvitation): ProfileInvitationSummary['status'] {
    if (invitation.status === 'PENDING' && invitation.expiresAt.getTime() < Date.now()) {
      return 'EXPIRED';
    }
    return invitation.status;
  }

  private webBase(): string {
    return (this.config.get<string>('WEB_BASE_URL')?.trim() || 'http://localhost:3000').replace(/\/$/, '');
  }

  private locale(): string {
    return this.config.get<string>('DEFAULT_LOCALE')?.trim() || 'ru';
  }

  private acceptUrl(rawToken: string): string {
    return `${this.webBase()}/${this.locale()}/invite?token=${rawToken}`;
  }

  private registerUrl(rawToken: string): string {
    return `${this.webBase()}/${this.locale()}/register?invite=${rawToken}`;
  }
}

function toInvitationSummary(invitation: ProfileInvitation): ProfileInvitationSummary {
  return {
    id: invitation.id,
    email: invitation.email,
    relationship: invitation.relationship,
    accessLevel: invitation.accessLevel,
    canAccessWellness: invitation.canAccessWellness,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

function profileName(firstName: string, lastName: string, fallback: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || fallback;
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
