import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ProfileSharingService } from './profile-sharing.service';

/**
 * Unit tests for invitation issuance and acceptance: self-invite and
 * already-member guards, wellness defaulting, the existing-vs-new email split,
 * email-match enforcement on accept, and auto-accept on email verification.
 */
describe('ProfileSharingService', () => {
  const OWNER_PROFILE = {
    firstName: 'Ronnie',
    lastName: "O'Sullivan",
    user: { displayName: 'Ronnie', email: 'owner@example.com' },
  };

  function make(prismaOverrides: Record<string, unknown> = {}) {
    const email = {
      sendCabinetInvitationExisting: jest.fn().mockResolvedValue(undefined),
      sendCabinetInvitationNew: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      playerProfile: { findUnique: jest.fn().mockResolvedValue(OWNER_PROFILE) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      profileMembership: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      profileInvitation: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'inv1',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 1000),
            createdAt: new Date(),
            ...data,
          }),
        ),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockResolvedValue([]),
      ...prismaOverrides,
    };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new ProfileSharingService(prisma as never, email as never, config as never);
    return { service, prisma, email };
  }

  describe('invite', () => {
    it('rejects inviting the cabinet owner', async () => {
      const { service } = make();
      await expect(
        service.invite('p1', 'owner', { email: 'owner@example.com', relationship: 'COACH', accessLevel: 'VIEW' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects inviting an existing member', async () => {
      const { service } = make({
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2' }) },
        profileMembership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
      });
      await expect(
        service.invite('p1', 'owner', { email: 'coach@example.com', relationship: 'COACH', accessLevel: 'EDIT' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('sends the register email and defaults wellness off for a guest with no account', async () => {
      const { service, email, prisma } = make();
      const result = await service.invite('p1', 'owner', {
        email: 'guest@example.com',
        relationship: 'GUEST',
        accessLevel: 'VIEW',
      });
      expect(email.sendCabinetInvitationNew).toHaveBeenCalledTimes(1);
      expect(email.sendCabinetInvitationExisting).not.toHaveBeenCalled();
      expect(prisma.profileInvitation.create.mock.calls[0][0].data.canAccessWellness).toBe(false);
      expect(result.relationship).toBe('GUEST');
    });

    it('sends the join email and defaults wellness on for a coach with an account', async () => {
      const { service, email, prisma } = make({
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2' }) },
        profileMembership: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      });
      await service.invite('p1', 'owner', {
        email: 'coach@example.com',
        relationship: 'COACH',
        accessLevel: 'EDIT',
      });
      expect(email.sendCabinetInvitationExisting).toHaveBeenCalledTimes(1);
      expect(prisma.profileInvitation.create.mock.calls[0][0].data.canAccessWellness).toBe(true);
    });

    it('supersedes any outstanding invite for the same email', async () => {
      const { service, prisma } = make();
      await service.invite('p1', 'owner', { email: 'g@example.com', relationship: 'GUEST', accessLevel: 'VIEW' });
      expect(prisma.profileInvitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REVOKED' } }),
      );
    });
  });

  describe('accept', () => {
    const invitation = {
      id: 'inv1',
      playerProfileId: 'p1',
      email: 'coach@example.com',
      relationship: 'COACH',
      accessLevel: 'EDIT',
      canAccessWellness: true,
      status: 'PENDING',
      invitedByUserId: 'owner',
      expiresAt: new Date(Date.now() + 10_000),
    };

    it('rejects accepting when the account email does not match the invite', async () => {
      const { service } = make({
        profileInvitation: { findUnique: jest.fn().mockResolvedValue(invitation) },
        user: { findUnique: jest.fn().mockResolvedValue({ email: 'someone-else@example.com' }) },
      });
      await expect(service.acceptByToken('u2', 'rawtoken')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a membership and marks the invite accepted on match', async () => {
      const tx = jest.fn().mockResolvedValue([]);
      const { service, prisma } = make({
        profileInvitation: {
          findUnique: jest.fn().mockResolvedValue(invitation),
          upsert: jest.fn(),
          update: jest.fn(),
        },
        user: { findUnique: jest.fn().mockResolvedValue({ email: 'coach@example.com' }) },
        $transaction: tx,
      });
      await service.acceptByToken('u2', 'rawtoken');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects an expired invitation', async () => {
      const { service } = make({
        profileInvitation: {
          findUnique: jest.fn().mockResolvedValue({ ...invitation, expiresAt: new Date(Date.now() - 1) }),
          update: jest.fn().mockResolvedValue({}),
        },
        user: { findUnique: jest.fn().mockResolvedValue({ email: 'coach@example.com' }) },
      });
      await expect(service.acceptByToken('u2', 'rawtoken')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('autoAcceptForEmail', () => {
    it('creates memberships for all pending invitations matching the email', async () => {
      const tx = jest.fn().mockResolvedValue([]);
      const { service } = make({
        profileInvitation: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'inv1', playerProfileId: 'p1', relationship: 'PARENT', accessLevel: 'VIEW', canAccessWellness: true, invitedByUserId: 'owner', expiresAt: new Date(Date.now() + 10_000) },
            { id: 'inv2', playerProfileId: 'p2', relationship: 'GUEST', accessLevel: 'VIEW', canAccessWellness: false, invitedByUserId: 'owner', expiresAt: new Date(Date.now() + 10_000) },
          ]),
          upsert: jest.fn(),
          update: jest.fn(),
        },
        $transaction: tx,
      });
      await service.autoAcceptForEmail('u2', 'kid@example.com');
      expect(tx).toHaveBeenCalledTimes(2);
    });
  });
});
