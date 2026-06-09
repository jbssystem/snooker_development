import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiReportStatus as PrismaAiReportStatus, AiReportType as PrismaAiReportType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import {
  AI_REPORT_QUEUE,
  ErrorCodes,
  GENERATE_WEEKLY_AI_REPORT_JOB,
  type ActiveAiFocusPreset,
  type AiProvider,
  type AiReport,
  type AiReportDataSources,
  type AiReportFocusArea,
  type AiReportStatus,
  type AiReportType,
  type GenerateExternalMatchReportInput,
  type GenerateWeeklyAiReportInput,
  type GenerateWeeklyAiReportJob,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import { SettingsService } from '../settings/settings.service';
import { SensitiveDataAuditService } from '../audit/sensitive-data-audit.service';
import type { ProfileContext } from '../profiles/profile-context';

type AiReportEntity = Prisma.AiReportGetPayload<Record<string, never>>;
type ProfileEntity = Prisma.PlayerProfileGetPayload<Record<string, never>>;
type WeeklySourceData = {
  trainingSessions: Array<{ drillExecutions: unknown[] }>;
  matches: unknown[];
  calendarEvents: unknown[];
  lifestyleFactors: unknown[];
  supplementEvents: unknown[];
  previousReports: unknown[];
  externalImports: unknown[];
};

const PROMPT_VERSION = 'weekly-summary@1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REPORT_PERIOD_DAYS = 31;

@Injectable()
export class AiService implements OnModuleDestroy {
  private queue: Queue<GenerateWeeklyAiReportJob> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly sensitiveAudit: SensitiveDataAuditService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async listActiveFocusPresets(locale?: string): Promise<ActiveAiFocusPreset[]> {
    const lang = toLocale(locale ?? 'ru');
    const rows = await this.prisma.aiFocusPreset.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({ id: row.id, slug: row.slug, label: pickLabel(row.labelJson, lang) }));
  }

  /** Loads selected focus presets and projects them onto the report locale. */
  private async loadFocusAreas(
    focusPresetIds: string[] | undefined,
    locale: string,
  ): Promise<Array<AiReportFocusArea & { instruction: string }>> {
    if (!focusPresetIds || focusPresetIds.length === 0) return [];
    const lang = toLocale(locale);
    const rows = await this.prisma.aiFocusPreset.findMany({
      where: { id: { in: focusPresetIds }, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({
      slug: row.slug,
      label: pickLabel(row.labelJson, lang),
      instruction: row.promptInstruction,
    }));
  }

  async listReports(profileId: string): Promise<AiReport[]> {
    const reports = await this.prisma.aiReport.findMany({
      where: { playerProfileId: profileId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reports.map(toAiReport);
  }

  async getReport(profileId: string, id: string): Promise<AiReport> {
    return toAiReport(await this.findReportOrThrow(profileId, id));
  }

  async generateWeeklyReport(ctx: ProfileContext, input: GenerateWeeklyAiReportInput): Promise<AiReport> {
    const userId = ctx.userId;
    const profile = await this.loadProfileOrThrow(ctx.profileId);
    const period = resolvePeriod(input);
    const runtime = await this.settings.getAiRuntime();
    const focusAreas = await this.loadFocusAreas(input.focusPresetIds, input.locale);
    const rawSourceData = { ...(await this.collectSourceData(profile, period.from, period.to)), focusAreas };
    const sourceData = toJsonValue(rawSourceData);
    const dataSources = countDataSources(rawSourceData);
    const report = await this.prisma.aiReport.create({
      data: {
        playerProfileId: profile.id,
        requestedByUserId: userId,
        reportType: 'WEEKLY_SUMMARY',
        status: 'QUEUED',
        periodStart: period.from,
        periodEnd: period.to,
        locale: input.locale,
        title: reportTitle(input.locale, period.from, period.to),
        sourceDataHash: hashJson(sourceData),
        sourceDataJson: sourceData,
        dataSourcesJson: dataSources as unknown as Prisma.InputJsonValue,
        promptVersion: PROMPT_VERSION,
        provider: runtime.provider,
        model: runtime.model,
      },
    });

    // A weekly report bundles wellness/supplement data and ships it to the AI
    // provider, so the egress is itself sensitive-data access (TZ §16.3).
    await this.recordSensitiveEgress(userId, profile.id, report.id, runtime.provider, dataSources);

    try {
      await this.getQueue().add(
        GENERATE_WEEKLY_AI_REPORT_JOB,
        { reportId: report.id },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5_000 },
          jobId: report.id,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      const failed = await this.prisma.aiReport.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      return toAiReport(failed);
    }

    return toAiReport(report);
  }

  /** Audits any wellness/supplement data leaving in an AI report payload. */
  private async recordSensitiveEgress(
    userId: string,
    playerProfileId: string,
    reportId: string,
    provider: AiProvider,
    dataSources: AiReportDataSources,
  ): Promise<void> {
    const common = { actorUserId: userId, playerProfileId, action: 'READ' as const, targetId: reportId };
    if (dataSources.lifestyleFactors > 0) {
      await this.sensitiveAudit.record({
        ...common,
        dataType: 'LIFESTYLE',
        metadata: { via: 'ai_report', provider, count: dataSources.lifestyleFactors },
      });
    }
    if (dataSources.supplementEvents > 0) {
      await this.sensitiveAudit.record({
        ...common,
        dataType: 'SUPPLEMENT',
        metadata: { via: 'ai_report', provider, count: dataSources.supplementEvents },
      });
    }
  }

  async generateExternalMatchReport(ctx: ProfileContext, input: GenerateExternalMatchReportInput): Promise<AiReport> {
    const userId = ctx.userId;
    const profile = await this.loadProfileOrThrow(ctx.profileId);
    const matches = await this.prisma.match.findMany({
      where: { id: { in: input.matchIds }, playerProfileId: profile.id, source: 'EXTERNAL' },
      include: { frames: { orderBy: { frameNumber: 'asc' } } },
      orderBy: { matchDate: 'asc' },
    });

    if (matches.length === 0) {
      throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
    }

    const runtime = await this.settings.getAiRuntime();
    const focusAreas = await this.loadFocusAreas(input.focusPresetIds, input.locale);
    const periodStart = matches[0]!.matchDate;
    const periodEnd = matches[matches.length - 1]!.matchDate;

    const rawSourceData = {
      generatedAt: new Date().toISOString(),
      selectedMatchCount: matches.length,
      focusAreas,
      player: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        level: profile.level,
        seasonGoal: profile.seasonGoal,
        dominantHand: profile.dominantHand,
        country: profile.country,
      },
      matches: matches.map((m) => ({
        matchDate: m.matchDate.toISOString(),
        opponentName: m.opponentName,
        tournament: m.tournament,
        round: m.round,
        format: m.format,
        framesWon: m.framesWon,
        framesLost: m.framesLost,
        highBreak: m.highBreak,
        breaks50: m.breaks50,
        breaks70: m.breaks70,
        breaks100: m.breaks100,
        result: m.result,
        decidingFrameResult: m.decidingFrameResult,
        notes: m.notes,
        frames: m.frames.map((f) => ({
          frameNumber: f.frameNumber,
          playerScore: f.playerScore,
          opponentScore: f.opponentScore,
          winner: f.winner,
          highBreak: f.highBreak,
          notes: f.notes,
        })),
      })),
    };

    const sourceData = toJsonValue(rawSourceData);
    const dataSources: AiReportDataSources = {
      trainingSessions: 0,
      drillExecutions: 0,
      matches: matches.length,
      calendarEvents: 0,
      lifestyleFactors: 0,
      supplementEvents: 0,
      previousReports: 0,
      externalImports: 0,
    };

    const report = await this.prisma.aiReport.create({
      data: {
        playerProfileId: profile.id,
        requestedByUserId: userId,
        reportType: 'EXTERNAL_ANALYSIS',
        status: 'QUEUED',
        periodStart,
        periodEnd,
        locale: input.locale,
        title: externalReportTitle(input.locale, matches.length),
        sourceDataHash: hashJson(sourceData),
        sourceDataJson: sourceData,
        dataSourcesJson: dataSources as unknown as Prisma.InputJsonValue,
        promptVersion: 'external-analysis@1',
        provider: runtime.provider,
        model: runtime.model,
      },
    });

    try {
      await this.getQueue().add(
        GENERATE_WEEKLY_AI_REPORT_JOB,
        { reportId: report.id },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5_000 },
          jobId: report.id,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      const failed = await this.prisma.aiReport.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
      return toAiReport(failed);
    }

    return toAiReport(report);
  }

  private async loadProfileOrThrow(profileId: string): Promise<ProfileEntity> {
    const profile = await this.prisma.playerProfile.findUnique({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return profile;
  }

  private async findReportOrThrow(profileId: string, id: string): Promise<AiReportEntity> {
    const report = await this.prisma.aiReport.findFirst({ where: { id, playerProfileId: profileId } });
    if (!report) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return report;
  }

  private async collectSourceData(profile: ProfileEntity, from: Date, to: Date) {
    const previousReportCutoff = new Date(from.getTime() - 1);
    const [
      trainingSessions,
      matches,
      calendarEvents,
      lifestyleFactors,
      supplementEvents,
      previousReports,
      externalImports,
    ] =
      await Promise.all([
        this.prisma.trainingSession.findMany({
          where: { playerProfileId: profile.id, startedAt: { gte: from, lte: to } },
          include: {
            drillExecutions: {
              include: { drillTemplate: { select: { name: true, category: true } } },
              orderBy: { startedAt: 'asc' },
            },
          },
          orderBy: { startedAt: 'asc' },
        }),
        this.prisma.match.findMany({
          where: { playerProfileId: profile.id, matchDate: { gte: from, lte: to } },
          include: { frames: { orderBy: { frameNumber: 'asc' } } },
          orderBy: { matchDate: 'asc' },
        }),
        this.prisma.calendarEvent.findMany({
          where: { playerProfileId: profile.id, startAt: { gte: from, lte: to } },
          orderBy: { startAt: 'asc' },
        }),
        this.prisma.lifestyleFactor.findMany({
          where: { playerProfileId: profile.id, date: { gte: from, lte: to } },
          orderBy: { date: 'asc' },
        }),
        this.prisma.supplementEvent.findMany({
          where: {
            playerProfileId: profile.id,
            startDate: { lte: to },
            OR: [{ endDate: null }, { endDate: { gte: from } }],
          },
          orderBy: { startDate: 'asc' },
        }),
        this.prisma.aiReport.findMany({
          where: {
            playerProfileId: profile.id,
            reportType: 'WEEKLY_SUMMARY',
            status: 'COMPLETED',
            periodEnd: { lte: previousReportCutoff },
          },
          orderBy: { periodEnd: 'desc' },
          take: 1,
        }),
        this.prisma.externalImportJob.findMany({
          where: {
            status: 'COMPLETED',
            externalLink: { playerProfileId: profile.id },
          },
          include: { externalLink: { select: { source: true, externalId: true, displayName: true, lastSyncedAt: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      period: { from: from.toISOString(), to: to.toISOString() },
      player: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        level: profile.level,
        seasonGoal: profile.seasonGoal,
        dominantHand: profile.dominantHand,
        country: profile.country,
      },
      trainingSessions: trainingSessions.map((session) => ({
        title: session.title,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        sessionType: session.sessionType,
        goal: session.goal,
        intensity: session.intensity,
        fatigueBefore: session.fatigueBefore,
        fatigueAfter: session.fatigueAfter,
        focusLevel: session.focusLevel,
        mood: session.mood,
        drillExecutions: session.drillExecutions.map((execution) => ({
          drillName: execution.drillTemplate.name,
          category: execution.drillTemplate.category,
          attempts: execution.attempts,
          successes: execution.successes,
          score: execution.score,
          maxRun: execution.maxRun,
          averageScore: execution.averageScore,
          errorTags: execution.errorTags,
          coachNotes: execution.coachNotes,
          playerNotes: execution.playerNotes,
        })),
      })),
      matches: matches.map((match) => ({
        matchDate: match.matchDate.toISOString(),
        opponentName: match.opponentName,
        tournament: match.tournament,
        framesWon: match.framesWon,
        framesLost: match.framesLost,
        highBreak: match.highBreak,
        breaks50: match.breaks50,
        breaks70: match.breaks70,
        breaks100: match.breaks100,
        result: match.result,
        format: match.format,
        pointsContext: match.notes,
        frames: match.frames.map((frame) => ({
          frameNumber: frame.frameNumber,
          playerScore: frame.playerScore,
          opponentScore: frame.opponentScore,
          winner: frame.winner,
          highBreak: frame.highBreak,
          notes: frame.notes,
        })),
        notes: match.notes,
      })),
      calendarEvents: calendarEvents.map((event) => ({
        eventType: event.eventType,
        title: event.title,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt?.toISOString(),
      })),
      lifestyleFactors: lifestyleFactors.map((factor) => ({
        date: factor.date.toISOString(),
        sleepHours: factor.sleepHours,
        sleepQuality: factor.sleepQuality,
        fatigue: factor.fatigue,
        stress: factor.stress,
        focus: factor.focus,
        mood: factor.mood,
        illness: factor.illness,
        injury: factor.injury,
        travel: factor.travel,
      })),
      supplementEvents: supplementEvents.map((event) => ({
        name: event.name,
        category: event.category,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString(),
        reason: event.reason,
      })),
      previousReports: previousReports.map((report) => ({
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        title: report.title,
        contentMarkdown: report.contentMarkdown,
      })),
      externalImports: externalImports.map((job) => ({
        source: job.externalLink.source,
        externalId: job.externalLink.externalId,
        displayName: job.externalLink.displayName,
        lastSyncedAt: job.externalLink.lastSyncedAt?.toISOString(),
        importedAt: job.createdAt.toISOString(),
        matchesImported: job.matchesImported,
        matchesSkipped: job.matchesSkipped,
        logJson: job.logJson,
      })),
    };
  }

  private getQueue(): Queue<GenerateWeeklyAiReportJob> {
    this.queue ??= new Queue<GenerateWeeklyAiReportJob>(AI_REPORT_QUEUE, {
      connection: redisConnection(this.config.get<string>('REDIS_URL')),
    });
    return this.queue;
  }
}

function toAiReport(report: AiReportEntity): AiReport {
  return {
    id: report.id,
    playerProfileId: report.playerProfileId,
    requestedByUserId: report.requestedByUserId,
    reportType: fromPrismaReportType(report.reportType),
    status: fromPrismaReportStatus(report.status),
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    locale: toLocale(report.locale),
    ...(report.title ? { title: report.title } : {}),
    ...(report.contentMarkdown ? { contentMarkdown: report.contentMarkdown } : {}),
    sourceDataHash: report.sourceDataHash,
    ...(report.reportType === 'EXTERNAL_ANALYSIS' ? { sourceData: report.sourceDataJson } : {}),
    ...(() => {
      const focusAreas = extractFocusAreas(report.sourceDataJson);
      return focusAreas.length > 0 ? { focusAreas } : {};
    })(),
    dataSources: toDataSources(report.dataSourcesJson),
    promptVersion: report.promptVersion,
    provider: toAiProvider(report.provider),
    model: report.model,
    ...(report.errorMessage ? { errorMessage: report.errorMessage } : {}),
    ...(report.completedAt ? { completedAt: report.completedAt.toISOString() } : {}),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

function pickLabel(value: Prisma.JsonValue, locale: 'ru' | 'en' | 'uk'): string {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const localized = data[locale];
  if (typeof localized === 'string' && localized.length > 0) return localized;
  const fallback = data.en ?? data.ru;
  return typeof fallback === 'string' ? fallback : '';
}

function extractFocusAreas(value: Prisma.JsonValue): AiReportFocusArea[] {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const raw = data?.focusAreas;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const slug = typeof entry.slug === 'string' ? entry.slug : '';
      const label = typeof entry.label === 'string' ? entry.label : '';
      return { slug, label };
    })
    .filter((entry) => entry.slug.length > 0);
}

function resolvePeriod(input: GenerateWeeklyAiReportInput): { from: Date; to: Date } {
  const to = input.periodEnd ? parseDate(input.periodEnd) : new Date();
  const from = input.periodStart ? parseDate(input.periodStart) : startOfDay(addDays(to, -6));
  if (from > to) {
    throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
  }
  if (to.getTime() - from.getTime() > MAX_REPORT_PERIOD_DAYS * DAY_MS) {
    throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
  }
  return { from, to };
}

function countDataSources(sourceData: WeeklySourceData): AiReportDataSources {
  return {
    trainingSessions: sourceData.trainingSessions.length,
    drillExecutions: sourceData.trainingSessions.reduce((total, session) => total + session.drillExecutions.length, 0),
    matches: sourceData.matches.length,
    calendarEvents: sourceData.calendarEvents.length,
    lifestyleFactors: sourceData.lifestyleFactors.length,
    supplementEvents: sourceData.supplementEvents.length,
    previousReports: sourceData.previousReports.length,
    externalImports: sourceData.externalImports.length,
  };
}

function reportTitle(locale: string, from: Date, to: Date): string {
  const start = from.toISOString().slice(0, 10);
  const end = to.toISOString().slice(0, 10);
  if (locale === 'en') return `Weekly summary: ${start} - ${end}`;
  if (locale === 'uk') return `Тижневий звіт: ${start} - ${end}`;
  return `Недельная сводка: ${start} - ${end}`;
}

function externalReportTitle(locale: string, count: number): string {
  if (locale === 'en') return `External match analysis: ${count} match${count === 1 ? '' : 'es'}`;
  if (locale === 'uk') return `Аналіз зовнішніх матчів: ${count} матч${count === 1 ? '' : 'ів'}`;
  return `Анализ внешних матчей: ${count} матч${count === 1 ? '' : 'ей'}`;
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function toDataSources(value: Prisma.JsonValue): AiReportDataSources {
  const data = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
  return {
    trainingSessions: numberFromJson(data, 'trainingSessions'),
    drillExecutions: numberFromJson(data, 'drillExecutions'),
    matches: numberFromJson(data, 'matches'),
    calendarEvents: numberFromJson(data, 'calendarEvents'),
    lifestyleFactors: numberFromJson(data, 'lifestyleFactors'),
    supplementEvents: numberFromJson(data, 'supplementEvents'),
    previousReports: numberFromJson(data, 'previousReports'),
    externalImports: numberFromJson(data, 'externalImports'),
  };
}

function numberFromJson(value: Prisma.JsonObject, key: string): number {
  const candidate = value[key];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0;
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
  }
  return date;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function fromPrismaReportType(value: PrismaAiReportType): AiReportType {
  return { WEEKLY_SUMMARY: 'weekly_summary', EXTERNAL_ANALYSIS: 'external_analysis' }[value] as AiReportType;
}

function fromPrismaReportStatus(value: PrismaAiReportStatus): AiReportStatus {
  return {
    QUEUED: 'queued',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
  }[value] as AiReportStatus;
}

function toAiProvider(value: string): AiProvider {
  return value === 'anthropic' || value === 'openai' || value === 'local' || value === 'none' ? value : 'none';
}

function toLocale(value: string): 'ru' | 'en' | 'uk' {
  return value === 'en' || value === 'uk' ? value : 'ru';
}

function redisConnection(redisUrl: string | undefined) {
  const parsed = new URL(redisUrl || 'redis://localhost:6379');
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
  };
}