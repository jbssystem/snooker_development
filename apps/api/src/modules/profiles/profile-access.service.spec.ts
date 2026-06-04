import { ForbiddenException } from '@nestjs/common';
import { ProfileAccessService, defaultWellnessAccess } from './profile-access.service';

/**
 * Unit tests for cabinet access resolution: owner shortcut, membership lookup,
 * denial when no relationship exists, and the accessible-cabinet listing that
 * powers the account switcher.
 */
describe('ProfileAccessService', () => {
  function makeService(prisma: Record<string, unknown>) {
    return new ProfileAccessService(prisma as never);
  }

  describe('resolve', () => {
    it('returns null when no active profile is given and the user has no cabinet', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.resolve('u1')).resolves.toBeNull();
    });

    it('treats the user as owner of their own cabinet (no header)', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      });
      const ctx = await service.resolve('u1');
      expect(ctx).toMatchObject({
        userId: 'u1',
        profileId: 'p1',
        isOwner: true,
        accessLevel: 'EDIT',
        canAccessWellness: true,
        relationship: 'OWNER',
      });
    });

    it('treats the user as owner when the active profile is their own', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: 'u1' }) },
      });
      const ctx = await service.resolve('u1', 'p1');
      expect(ctx?.isOwner).toBe(true);
      expect(ctx?.accessLevel).toBe('EDIT');
    });

    it('resolves a membership for a shared cabinet', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p2', userId: 'owner' }) },
        profileMembership: {
          findUnique: jest.fn().mockResolvedValue({
            accessLevel: 'VIEW',
            canAccessWellness: false,
            relationship: 'GUEST',
          }),
        },
      });
      const ctx = await service.resolve('u1', 'p2');
      expect(ctx).toMatchObject({
        userId: 'u1',
        profileId: 'p2',
        isOwner: false,
        accessLevel: 'VIEW',
        canAccessWellness: false,
        relationship: 'GUEST',
      });
    });

    it('denies access when no membership exists for a foreign cabinet', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p2', userId: 'owner' }) },
        profileMembership: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.resolve('u1', 'p2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('denies access when the active profile does not exist', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.resolve('u1', 'missing')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listAccessible', () => {
    it('lists the own cabinet first, then shared memberships', async () => {
      const service = makeService({
        playerProfile: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            firstName: 'Ronnie',
            lastName: "O'Sullivan",
            avatar: null,
            user: { displayName: 'Ronnie' },
          }),
        },
        profileMembership: {
          findMany: jest.fn().mockResolvedValue([
            {
              accessLevel: 'EDIT',
              canAccessWellness: true,
              relationship: 'COACH',
              playerProfile: {
                id: 'p2',
                firstName: 'Judd',
                lastName: 'Trump',
                avatar: 'preset:1',
                user: { displayName: 'Judd' },
              },
            },
          ]),
        },
      });

      const list = await service.listAccessible('u1');
      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({ profileId: 'p1', isOwner: true, relationship: 'OWNER' });
      expect(list[1]).toMatchObject({
        profileId: 'p2',
        isOwner: false,
        relationship: 'COACH',
        accessLevel: 'EDIT',
        canAccessWellness: true,
        displayName: 'Judd Trump',
      });
    });

    it('returns only shared cabinets when the user has no own profile', async () => {
      const service = makeService({
        playerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
        profileMembership: { findMany: jest.fn().mockResolvedValue([]) },
      });
      await expect(service.listAccessible('u1')).resolves.toEqual([]);
    });
  });

  describe('defaultWellnessAccess', () => {
    it('grants wellness to coaches and parents, not guests', () => {
      expect(defaultWellnessAccess('COACH')).toBe(true);
      expect(defaultWellnessAccess('PARENT')).toBe(true);
      expect(defaultWellnessAccess('GUEST')).toBe(false);
    });
  });
});
