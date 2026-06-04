import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, SensitiveDataAccessAction, SensitiveDataType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

export type SensitiveAccessMeta = { ip?: string; userAgent?: string };

export type RecordAccessParams = {
  actorUserId: string;
  playerProfileId: string;
  dataType: SensitiveDataType;
  action: SensitiveDataAccessAction;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  meta?: SensitiveAccessMeta;
};

/**
 * Records an audit trail for access to sensitive wellness/supplement data
 * (TZ §16.3). Failures are logged but never propagate: a broken audit insert
 * must not take down wellness tracking or report generation. Because the trail
 * is for accountability, writes are append-only — there is no update/delete API.
 */
@Injectable()
export class SensitiveDataAuditService {
  private readonly logger = new Logger(SensitiveDataAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAccessParams): Promise<void> {
    try {
      await this.prisma.sensitiveDataAccessLog.create({
        data: {
          actorUserId: params.actorUserId,
          playerProfileId: params.playerProfileId,
          dataType: params.dataType,
          action: params.action,
          targetId: params.targetId ?? null,
          ...(params.metadata !== undefined ? { metadataJson: params.metadata } : {}),
          ipAddress: params.meta?.ip ?? null,
          userAgent: params.meta?.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record sensitive-data access (${params.dataType}/${params.action}) for profile ${params.playerProfileId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
