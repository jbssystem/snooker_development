import { Injectable } from '@nestjs/common';
import type { AdminStats } from '@snooker/shared';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<AdminStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalUsers, byStatus, totalAdmins, totalReports, tokenAgg, recent] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['status'], orderBy: { status: 'asc' }, _count: { _all: true } }),
      this.prisma.role.count({ where: { roleType: 'SYSTEM_ADMIN' } }),
      this.prisma.aiReport.count({ where: { status: 'COMPLETED' } }),
      this.prisma.aiReport.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, email: true, displayName: true, createdAt: true, status: true },
      }),
    ]);

    const usersByStatus: Record<string, number> = {};
    for (const row of byStatus) usersByStatus[row.status] = row._count._all;

    return {
      totalUsers,
      usersByStatus,
      totalAdmins,
      totalReports,
      tokensThisMonth: (tokenAgg._sum.inputTokens ?? 0) + (tokenAgg._sum.outputTokens ?? 0),
      recentSignups: recent.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        createdAt: u.createdAt.toISOString(),
        status: u.status,
      })),
    };
  }
}
