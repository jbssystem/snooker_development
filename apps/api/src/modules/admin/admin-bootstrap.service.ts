import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.module';

/**
 * Ensures a SYSTEM_ADMIN super-admin exists, seeded from environment variables.
 * Idempotent: runs on every startup. The password is only re-synced when
 * ADMIN_RESET_PASSWORD=true, so an in-app password change is not clobbered.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping super-admin bootstrap.');
      return;
    }
    const displayName = this.config.get<string>('ADMIN_DISPLAY_NAME')?.trim() || 'Administrator';
    const resetPassword =
      this.config.get<string>('ADMIN_RESET_PASSWORD')?.trim().toLowerCase() === 'true';

    const existing = await this.prisma.user.findUnique({ where: { email } });
    let userId: string;
    if (!existing) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      const created = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });
      userId = created.id;
      this.logger.log(`Created super-admin user ${email}.`);
    } else {
      userId = existing.id;
      const data: { passwordHash?: string; status?: 'ACTIVE'; emailVerifiedAt?: Date } = {};
      if (resetPassword) {
        data.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      }
      if (existing.status !== 'ACTIVE') data.status = 'ACTIVE';
      if (!existing.emailVerifiedAt) data.emailVerifiedAt = new Date();
      if (Object.keys(data).length > 0) {
        await this.prisma.user.update({ where: { id: userId }, data });
      }
    }

    const hasAdminRole = await this.prisma.role.findFirst({
      where: { userId, roleType: 'SYSTEM_ADMIN' },
    });
    if (!hasAdminRole) {
      await this.prisma.role.create({ data: { userId, roleType: 'SYSTEM_ADMIN' } });
      this.logger.log(`Granted SYSTEM_ADMIN role to ${email}.`);
    }
  }
}
