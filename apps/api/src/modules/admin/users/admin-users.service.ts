import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, RoleType, UserStatus } from '@prisma/client';
import {
  ErrorCodes,
  type AdminUserDetail,
  type AdminUserList,
  type AdminUserListItem,
  type AdminUsersQuery,
  type UserTokenUsage,
} from '@snooker/shared';
import { PrismaService } from '../../prisma/prisma.module';
import { AdminAuditService } from '../admin-audit.service';

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  blockedAt: Date | null;
  blockedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  roles: { roleType: RoleType }[];
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: AdminUsersQuery): Promise<AdminUserList> {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.role) where.roles = { some: { roleType: query.role } };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: userSelect,
      }),
    ]);

    const usage = await this.usageByUser(users.map((u) => u.id));
    return {
      items: users.map((u) => toListItem(u, usage.get(u.id) ?? emptyUsage())),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    const usage = await this.usageByUser([id]);
    const item = toListItem(user, usage.get(id) ?? emptyUsage());
    return {
      ...item,
      updatedAt: user.updatedAt.toISOString(),
      blockedAt: user.blockedAt?.toISOString() ?? null,
    };
  }

  async block(actorUserId: string, id: string, reason?: string): Promise<AdminUserDetail> {
    if (actorUserId === id) {
      throw new BadRequestException({ error: { code: ErrorCodes.Admin.CannotBlockSelf } });
    }
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: 'BLOCKED', blockedAt: new Date(), blockedReason: reason ?? null },
      }),
      // Kill active sessions immediately.
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.record(actorUserId, 'user.block', { type: 'user', id }, { reason: reason ?? null });
    return this.get(id);
  }

  async unblock(actorUserId: string, id: string): Promise<AdminUserDetail> {
    await this.ensureExists(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', blockedAt: null, blockedReason: null },
    });
    await this.audit.record(actorUserId, 'user.unblock', { type: 'user', id });
    return this.get(id);
  }

  async grantAdmin(actorUserId: string, id: string): Promise<AdminUserDetail> {
    await this.ensureExists(id);
    const existing = await this.prisma.role.findFirst({
      where: { userId: id, roleType: 'SYSTEM_ADMIN' },
    });
    if (!existing) {
      await this.prisma.role.create({ data: { userId: id, roleType: 'SYSTEM_ADMIN' } });
      await this.audit.record(actorUserId, 'user.grantAdmin', { type: 'user', id });
    }
    return this.get(id);
  }

  async revokeAdmin(actorUserId: string, id: string): Promise<AdminUserDetail> {
    await this.ensureExists(id);
    const adminCount = await this.prisma.role.count({ where: { roleType: 'SYSTEM_ADMIN' } });
    const targetAdminRoles = await this.prisma.role.count({
      where: { userId: id, roleType: 'SYSTEM_ADMIN' },
    });
    if (targetAdminRoles > 0 && adminCount - targetAdminRoles < 1) {
      throw new BadRequestException({ error: { code: ErrorCodes.Admin.LastAdmin } });
    }
    await this.prisma.role.deleteMany({ where: { userId: id, roleType: 'SYSTEM_ADMIN' } });
    await this.audit.record(actorUserId, 'user.revokeAdmin', { type: 'user', id });
    return this.get(id);
  }

  /** Manually verify a user (support tool — skips the email round-trip). */
  async verify(actorUserId: string, id: string): Promise<AdminUserDetail> {
    await this.ensureExists(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
    await this.audit.record(actorUserId, 'user.verify', { type: 'user', id });
    return this.get(id);
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
  }

  private async usageByUser(userIds: string[]): Promise<Map<string, UserTokenUsage>> {
    const map = new Map<string, UserTokenUsage>();
    if (userIds.length === 0) return map;
    const grouped = await this.prisma.aiReport.groupBy({
      by: ['requestedByUserId'],
      where: { requestedByUserId: { in: userIds }, status: 'COMPLETED' },
      _sum: { inputTokens: true, outputTokens: true },
      _count: { _all: true },
    });
    for (const g of grouped) {
      const inputTokens = g._sum.inputTokens ?? 0;
      const outputTokens = g._sum.outputTokens ?? 0;
      map.set(g.requestedByUserId, {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        reportCount: g._count._all,
      });
    }
    return map;
  }
}

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  status: true,
  emailVerifiedAt: true,
  blockedAt: true,
  blockedReason: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  roles: { select: { roleType: true } },
} satisfies Prisma.UserSelect;

function emptyUsage(): UserTokenUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, reportCount: 0 };
}

function toListItem(user: UserRow, tokenUsage: UserTokenUsage): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles.map((r) => r.roleType),
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    blockedReason: user.blockedReason,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    tokenUsage,
  };
}
