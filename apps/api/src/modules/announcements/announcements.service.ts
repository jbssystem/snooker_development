import { Injectable } from '@nestjs/common';
import type { ActiveAnnouncement } from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import { reverseSeverityMap, reverseTypeMap } from '../admin/announcements/admin-announcements.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Published announcements within their active window, not yet dismissed by the user. */
  async listActive(userId: string): Promise<ActiveAnnouncement[]> {
    const now = new Date();
    const rows = await this.prisma.announcement.findMany({
      where: {
        isPublished: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
        dismissals: { none: { userId } },
      },
      orderBy: [{ severity: 'desc' }, { publishedAt: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      type: reverseTypeMap[row.type],
      severity: reverseSeverityMap[row.severity],
      title: row.title,
      bodyMarkdown: row.bodyMarkdown,
      version: row.version,
      dismissible: row.dismissible,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  }

  async dismiss(userId: string, announcementId: string): Promise<void> {
    await this.prisma.announcementDismissal.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: {},
    });
  }
}
