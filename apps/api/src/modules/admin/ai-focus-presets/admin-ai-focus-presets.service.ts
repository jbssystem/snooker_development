import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AiFocusPreset as PrismaAiFocusPreset, Prisma } from '@prisma/client';
import {
  ErrorCodes,
  type AiFocusPreset,
  type AiFocusPresetLabel,
  type CreateAiFocusPresetInput,
  type UpdateAiFocusPresetInput,
} from '@snooker/shared';
import { PrismaService } from '../../prisma/prisma.module';
import { AdminAuditService } from '../admin-audit.service';

@Injectable()
export class AdminAiFocusPresetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(): Promise<AiFocusPreset[]> {
    const rows = await this.prisma.aiFocusPreset.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toAiFocusPreset);
  }

  async get(id: string): Promise<AiFocusPreset> {
    return toAiFocusPreset(await this.findOrThrow(id));
  }

  async create(actorUserId: string, input: CreateAiFocusPresetInput): Promise<AiFocusPreset> {
    await this.assertSlugFree(input.slug);
    const row = await this.prisma.aiFocusPreset.create({
      data: {
        slug: input.slug,
        labelJson: input.label as unknown as Prisma.InputJsonValue,
        promptInstruction: input.promptInstruction,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        createdByUserId: actorUserId,
      },
    });
    await this.audit.record(actorUserId, 'aiFocusPreset.create', { type: 'aiFocusPreset', id: row.id });
    return toAiFocusPreset(row);
  }

  async update(actorUserId: string, id: string, input: UpdateAiFocusPresetInput): Promise<AiFocusPreset> {
    await this.findOrThrow(id);
    if (input.slug !== undefined) await this.assertSlugFree(input.slug, id);
    const data: Prisma.AiFocusPresetUpdateInput = {};
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.label !== undefined) data.labelJson = input.label as unknown as Prisma.InputJsonValue;
    if (input.promptInstruction !== undefined) data.promptInstruction = input.promptInstruction;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    const row = await this.prisma.aiFocusPreset.update({ where: { id }, data });
    await this.audit.record(actorUserId, 'aiFocusPreset.update', { type: 'aiFocusPreset', id });
    return toAiFocusPreset(row);
  }

  async delete(actorUserId: string, id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.aiFocusPreset.delete({ where: { id } });
    await this.audit.record(actorUserId, 'aiFocusPreset.delete', { type: 'aiFocusPreset', id });
  }

  private async assertSlugFree(slug: string, exceptId?: string): Promise<void> {
    const existing = await this.prisma.aiFocusPreset.findUnique({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException({ error: { code: ErrorCodes.Validation.Failed } });
    }
  }

  private async findOrThrow(id: string): Promise<PrismaAiFocusPreset> {
    const row = await this.prisma.aiFocusPreset.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    return row;
  }
}

export function parsePresetLabel(value: Prisma.JsonValue): AiFocusPresetLabel {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const pick = (key: string): string => (typeof data[key] === 'string' ? (data[key] as string) : '');
  return { ru: pick('ru'), en: pick('en'), uk: pick('uk') };
}

export function toAiFocusPreset(row: PrismaAiFocusPreset): AiFocusPreset {
  return {
    id: row.id,
    slug: row.slug,
    label: parsePresetLabel(row.labelJson),
    promptInstruction: row.promptInstruction,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
