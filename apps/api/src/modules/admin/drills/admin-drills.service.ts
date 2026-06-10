import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ErrorCodes,
  type DrillTemplate,
  type SetDrillHiddenInput,
  type UpdateDrillVisibilityInput,
} from '@snooker/shared';
import { PrismaService } from '../../prisma/prisma.module';
import { toDrillTemplate, toPrismaVisibility } from '../../drills/drills.service';
import { AdminAuditService } from '../admin-audit.service';

@Injectable()
export class AdminDrillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  /** Unfiltered list across all owners and visibilities (admin moderation view). */
  async list(search?: string): Promise<DrillTemplate[]> {
    const where: Prisma.DrillTemplateWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.drillTemplate.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return rows.map(toDrillTemplate);
  }

  /** Change visibility regardless of owner — this is how an admin makes a drill global. */
  async setVisibility(
    actorUserId: string,
    id: string,
    input: UpdateDrillVisibilityInput,
  ): Promise<DrillTemplate> {
    const existing = await this.prisma.drillTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    const row = await this.prisma.drillTemplate.update({
      where: { id },
      data: { visibility: toPrismaVisibility(input.visibility) },
    });
    await this.audit.record(actorUserId, 'drill.setVisibility', { type: 'drill', id }, {
      visibility: input.visibility,
    });
    return toDrillTemplate(row);
  }

  /**
   * Hide or unhide a drill. A hidden drill drops out of the library and the
   * new-session picker, but stays referenced by existing executions.
   */
  async setHidden(
    actorUserId: string,
    id: string,
    input: SetDrillHiddenInput,
  ): Promise<DrillTemplate> {
    const existing = await this.prisma.drillTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    const row = await this.prisma.drillTemplate.update({
      where: { id },
      data: { hiddenAt: input.hidden ? new Date() : null },
    });
    await this.audit.record(actorUserId, 'drill.setHidden', { type: 'drill', id }, {
      hidden: input.hidden,
    });
    return toDrillTemplate(row);
  }

  async delete(actorUserId: string, id: string): Promise<void> {
    const existing = await this.prisma.drillTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    await this.prisma.drillTemplate.delete({ where: { id } });
    await this.audit.record(actorUserId, 'drill.delete', { type: 'drill', id });
  }
}
