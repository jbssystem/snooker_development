import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

/** Records an immutable trail of mutating admin actions for accountability. */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actorUserId: string,
    action: string,
    target?: { type?: string; id?: string },
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        ...(metadata !== undefined ? { metadataJson: metadata } : {}),
      },
    });
  }
}
