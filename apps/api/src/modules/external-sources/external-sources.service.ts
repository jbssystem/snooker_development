import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalSource as PrismaExternalSource, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import {
  EXTERNAL_IMPORT_QUEUE,
  SYNC_PLAYER_EXTERNAL_DATA_JOB,
  ErrorCodes,
  type CreateExternalLinkInput,
  type ExternalImportJob,
  type ExternalPlayerLink,
  type ExternalSourceType,
  type SyncPlayerExternalDataJob,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';

type LinkEntity = Prisma.ExternalPlayerLinkGetPayload<Record<string, never>>;
type JobEntity = Prisma.ExternalImportJobGetPayload<Record<string, never>>;

@Injectable()
export class ExternalSourcesService implements OnModuleDestroy {
  private queue: Queue<SyncPlayerExternalDataJob> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async listLinks(userId: string): Promise<ExternalPlayerLink[]> {
    const profile = await this.findProfile(userId);
    if (!profile) return [];

    const links = await this.prisma.externalPlayerLink.findMany({
      where: { playerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return links.map(toLink);
  }

  async createLink(userId: string, input: CreateExternalLinkInput): Promise<ExternalPlayerLink> {
    const profile = await this.findProfileOrThrow(userId);
    const { source, externalId, externalUrl, displayName } = parseUrl(input.url);

    const existing = await this.prisma.externalPlayerLink.findUnique({
      where: { playerProfileId_source: { playerProfileId: profile.id, source: toPrismaSource(source) } },
    });
    if (existing) {
      throw new BadRequestException(ErrorCodes.Validation.Failed);
    }

    const link = await this.prisma.externalPlayerLink.create({
      data: {
        playerProfileId: profile.id,
        source: toPrismaSource(source),
        externalId,
        externalUrl,
        displayName,
        syncEnabled: true,
      },
    });

    if (source === 'wst') {
      await this.prisma.playerProfile.update({
        where: { id: profile.id },
        data: { wstId: externalId },
      });
    } else if (source === 'cuetracker') {
      await this.prisma.playerProfile.update({
        where: { id: profile.id },
        data: { cuetrackerId: externalId },
      });
    }

    return toLink(link);
  }

  async deleteLink(userId: string, id: string): Promise<void> {
    const link = await this.findLinkOrThrow(userId, id);
    await this.prisma.externalPlayerLink.delete({ where: { id: link.id } });
  }

  async triggerSync(userId: string, id: string): Promise<ExternalImportJob> {
    const link = await this.findLinkOrThrow(userId, id);

    const job = await this.prisma.externalImportJob.create({
      data: {
        externalPlayerLinkId: link.id,
        status: 'QUEUED',
      },
    });

    const queue = await this.getQueue();
    await queue.add(SYNC_PLAYER_EXTERNAL_DATA_JOB, {
      externalPlayerLinkId: link.id,
      importJobId: job.id,
    });

    return toJob(job);
  }

  async listJobs(userId: string, linkId: string): Promise<ExternalImportJob[]> {
    await this.findLinkOrThrow(userId, linkId);

    const jobs = await this.prisma.externalImportJob.findMany({
      where: { externalPlayerLinkId: linkId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return jobs.map(toJob);
  }

  async listImportedMatches(userId: string) {
    const profile = await this.findProfile(userId);
    if (!profile) return [];

    const matches = await this.prisma.match.findMany({
      where: {
        playerProfileId: profile.id,
        source: 'EXTERNAL',
      },
      include: { frames: { orderBy: { frameNumber: 'asc' } } },
      orderBy: { matchDate: 'desc' },
      take: 100,
    });

    return matches.map((m) => ({
      id: m.id,
      matchDate: m.matchDate.toISOString(),
      tournament: m.tournament,
      round: m.round,
      format: m.format,
      opponentName: m.opponentName,
      opponentExternalId: m.opponentExternalId,
      framesWon: m.framesWon,
      framesLost: m.framesLost,
      highBreak: m.highBreak,
      breaks50: m.breaks50,
      breaks70: m.breaks70,
      breaks100: m.breaks100,
      decidingFrameResult: m.decidingFrameResult?.toLowerCase() ?? null,
      result: m.result.toLowerCase(),
      sourceUrl: m.sourceUrl,
      notes: m.notes,
      frames: m.frames.map((f) => ({
        frameNumber: f.frameNumber,
        playerScore: f.playerScore,
        opponentScore: f.opponentScore,
        winner: f.winner.toLowerCase(),
        highBreak: f.highBreak,
        notes: f.notes,
      })),
    }));
  }

  private async findProfile(userId: string) {
    return this.prisma.playerProfile.findUnique({ where: { userId } });
  }

  private async findProfileOrThrow(userId: string) {
    const profile = await this.findProfile(userId);
    if (!profile) throw new BadRequestException(ErrorCodes.Validation.Failed);
    return profile;
  }

  private async findLinkOrThrow(userId: string, linkId: string) {
    const profile = await this.findProfileOrThrow(userId);
    const link = await this.prisma.externalPlayerLink.findFirst({
      where: { id: linkId, playerProfileId: profile.id },
    });
    if (!link) throw new NotFoundException(ErrorCodes.Generic.NotFound);
    return link;
  }

  private async getQueue(): Promise<Queue<SyncPlayerExternalDataJob>> {
    if (!this.queue) {
      const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
      const url = new URL(redisUrl);
      this.queue = new Queue<SyncPlayerExternalDataJob>(EXTERNAL_IMPORT_QUEUE, {
        connection: {
          host: url.hostname,
          port: Number(url.port) || 6379,
          password: url.password || undefined,
        },
      });
    }
    return this.queue;
  }
}

function parseUrl(url: string): { source: ExternalSourceType; externalId: string; externalUrl: string; displayName: string | null } {
  if (url.includes('wst.tv/players/')) {
    const match = url.match(/wst\.tv\/players\/([0-9a-f-]{36})/i);
    if (!match?.[1]) throw new BadRequestException('Invalid WST URL format');
    return {
      source: 'wst' as const,
      externalId: match[1],
      externalUrl: `https://www.wst.tv/players/${match[1]}`,
      displayName: null,
    };
  }

  if (url.includes('cuetracker.net/players/')) {
    const match = url.match(/cuetracker\.net\/players\/([a-z0-9-]+)/i);
    if (!match?.[1]) throw new BadRequestException('Invalid CueTracker URL format');
    const slug = match[1].toLowerCase();
    return {
      source: 'cuetracker' as const,
      externalId: slug,
      externalUrl: `https://cuetracker.net/players/${slug}`,
      displayName: null,
    };
  }

  throw new BadRequestException('URL must be from wst.tv or cuetracker.net');
}

function toPrismaSource(source: ExternalSourceType): PrismaExternalSource {
  switch (source) {
    case 'wst': return 'WST';
    case 'cuetracker': return 'CUETRACKER';
  }
}

function toLink(entity: LinkEntity): ExternalPlayerLink {
  return {
    id: entity.id,
    playerProfileId: entity.playerProfileId,
    source: entity.source.toLowerCase() as ExternalSourceType,
    externalId: entity.externalId,
    externalUrl: entity.externalUrl,
    displayName: entity.displayName,
    syncEnabled: entity.syncEnabled,
    lastSyncedAt: entity.lastSyncedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
  };
}

function toJob(entity: JobEntity): ExternalImportJob {
  return {
    id: entity.id,
    externalPlayerLinkId: entity.externalPlayerLinkId,
    status: entity.status.toLowerCase() as ExternalImportJob['status'],
    startedAt: entity.startedAt?.toISOString() ?? null,
    completedAt: entity.completedAt?.toISOString() ?? null,
    matchesImported: entity.matchesImported,
    matchesSkipped: entity.matchesSkipped,
    statsImported: entity.statsImported,
    errorMessage: entity.errorMessage,
    createdAt: entity.createdAt.toISOString(),
  };
}
