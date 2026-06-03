import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Announcement as PrismaAnnouncement,
  AnnouncementSeverity as PrismaSeverity,
  AnnouncementType as PrismaType,
  Prisma,
} from '@prisma/client';
import {
  ErrorCodes,
  type Announcement,
  type AnnouncementSeverity,
  type AnnouncementType,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from '@snooker/shared';
import { PrismaService } from '../../prisma/prisma.module';
import { AdminAuditService } from '../admin-audit.service';

@Injectable()
export class AdminAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(): Promise<Announcement[]> {
    const rows = await this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toAnnouncement);
  }

  async get(id: string): Promise<Announcement> {
    return toAnnouncement(await this.findOrThrow(id));
  }

  async create(actorUserId: string, input: CreateAnnouncementInput): Promise<Announcement> {
    const row = await this.prisma.announcement.create({
      data: {
        type: typeMap[input.type],
        severity: severityMap[input.severity],
        title: input.title,
        bodyMarkdown: input.bodyMarkdown,
        version: input.version ?? null,
        dismissible: input.dismissible,
        isPublished: input.isPublished,
        publishedAt: input.isPublished ? new Date() : null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        createdByUserId: actorUserId,
      },
    });
    await this.audit.record(actorUserId, 'announcement.create', { type: 'announcement', id: row.id });
    return toAnnouncement(row);
  }

  async update(actorUserId: string, id: string, input: UpdateAnnouncementInput): Promise<Announcement> {
    const existing = await this.findOrThrow(id);
    const data: Prisma.AnnouncementUpdateInput = {};
    if (input.type !== undefined) data.type = typeMap[input.type];
    if (input.severity !== undefined) data.severity = severityMap[input.severity];
    if (input.title !== undefined) data.title = input.title;
    if (input.bodyMarkdown !== undefined) data.bodyMarkdown = input.bodyMarkdown;
    if (input.version !== undefined) data.version = input.version ?? null;
    if (input.dismissible !== undefined) data.dismissible = input.dismissible;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (input.isPublished !== undefined) {
      data.isPublished = input.isPublished;
      // Set publishedAt the first time it becomes published; keep it otherwise.
      if (input.isPublished && !existing.publishedAt) data.publishedAt = new Date();
      if (!input.isPublished) data.publishedAt = null;
    }
    const row = await this.prisma.announcement.update({ where: { id }, data });
    await this.audit.record(actorUserId, 'announcement.update', { type: 'announcement', id });
    return toAnnouncement(row);
  }

  async setPublished(actorUserId: string, id: string, published: boolean): Promise<Announcement> {
    const existing = await this.findOrThrow(id);
    const row = await this.prisma.announcement.update({
      where: { id },
      data: {
        isPublished: published,
        publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
      },
    });
    await this.audit.record(
      actorUserId,
      published ? 'announcement.publish' : 'announcement.unpublish',
      { type: 'announcement', id },
    );
    return toAnnouncement(row);
  }

  async delete(actorUserId: string, id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.announcement.delete({ where: { id } });
    await this.audit.record(actorUserId, 'announcement.delete', { type: 'announcement', id });
  }

  private async findOrThrow(id: string): Promise<PrismaAnnouncement> {
    const row = await this.prisma.announcement.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    return row;
  }
}

const typeMap: Record<AnnouncementType, PrismaType> = {
  release_note: 'RELEASE_NOTE',
  announcement: 'ANNOUNCEMENT',
  maintenance: 'MAINTENANCE',
};
const reverseTypeMap = Object.fromEntries(
  Object.entries(typeMap).map(([k, v]) => [v, k]),
) as Record<PrismaType, AnnouncementType>;

const severityMap: Record<AnnouncementSeverity, PrismaSeverity> = {
  info: 'INFO',
  warning: 'WARNING',
  critical: 'CRITICAL',
};
const reverseSeverityMap = Object.fromEntries(
  Object.entries(severityMap).map(([k, v]) => [v, k]),
) as Record<PrismaSeverity, AnnouncementSeverity>;

export function toAnnouncement(row: PrismaAnnouncement): Announcement {
  return {
    id: row.id,
    type: reverseTypeMap[row.type],
    severity: reverseSeverityMap[row.severity],
    title: row.title,
    bodyMarkdown: row.bodyMarkdown,
    version: row.version,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    dismissible: row.dismissible,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export { reverseTypeMap, reverseSeverityMap };
