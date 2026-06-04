import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

/**
 * Unit tests for AuthService.changePassword: current-password verification,
 * the rejection path, and that a valid change writes a fresh argon2 hash.
 * Prisma is mocked; argon2 runs for real (so the hash/verify is genuine).
 */
describe('AuthService.changePassword', () => {
  const CURRENT = 'current-secret-123';
  let currentHash: string;

  beforeAll(async () => {
    currentHash = await argon2.hash(CURRENT, { type: argon2.argon2id });
  });

  function makeService(user: unknown) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    // changePassword only touches prisma + argon2; other deps are unused here.
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  it('rejects a wrong current password without updating', async () => {
    const { service, prisma } = makeService({
      id: 'u1',
      status: 'ACTIVE',
      passwordHash: currentHash,
    });

    await expect(
      service.changePassword('u1', { currentPassword: 'wrong-password', newPassword: 'brand-new-456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('writes a new, verifiable hash on a correct current password', async () => {
    const { service, prisma } = makeService({
      id: 'u1',
      status: 'ACTIVE',
      passwordHash: currentHash,
    });

    await service.changePassword('u1', { currentPassword: CURRENT, newPassword: 'brand-new-456' });

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const arg = prisma.user.update.mock.calls[0][0] as { where: { id: string }; data: { passwordHash: string } };
    expect(arg.where).toEqual({ id: 'u1' });
    expect(arg.data.passwordHash).not.toBe(currentHash);
    await expect(argon2.verify(arg.data.passwordHash, 'brand-new-456')).resolves.toBe(true);
  });

  it('rejects when the account is missing or not active', async () => {
    const { service, prisma } = makeService(null);
    await expect(
      service.changePassword('u1', { currentPassword: CURRENT, newPassword: 'brand-new-456' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
