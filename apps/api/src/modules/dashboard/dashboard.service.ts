import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  DashboardDrillProgress,
  DashboardRecentSession,
  DashboardWeeklyPoint,
  PlayerDashboard,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';

type DashboardSession = Prisma.TrainingSessionGetPayload<{
  include: {
    drillExecutions: {
      include: { drillTemplate: { select: { id: true; name: true } } };
    };
  };
}>;

type DashboardMatch = Prisma.MatchGetPayload<Record<string, never>>;

type DrillAggregate = {
  drillTemplateId: string;
  drillTemplateName: string;
  executions: number;
  attempts: number;
  successes: number;
  lastPracticedAt: Date;
};

const DASHBOARD_DAYS = 28;
const WEEK_BUCKETS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayerDashboard(userId: string): Promise<PlayerDashboard> {
    const now = new Date();
    const from = startOfDay(addDays(now, -(DASHBOARD_DAYS - 1)));
    const to = now;
    const period = { from: from.toISOString(), to: to.toISOString(), days: DASHBOARD_DAYS };
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return emptyDashboard(period, from);
    }

    const [sessions, matches] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where: {
          playerProfileId: profile.id,
          startedAt: { gte: from, lte: to },
        },
        include: {
          drillExecutions: {
            include: {
              drillTemplate: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.match.findMany({
        where: {
          playerProfileId: profile.id,
          matchDate: { gte: from, lte: to },
        },
        orderBy: { matchDate: 'desc' },
      }),
    ]);

    return {
      period,
      totals: calculateTotals(sessions),
      weeklyVolume: calculateWeeklyVolume(sessions, from),
      drillProgress: calculateDrillProgress(sessions),
      matchSummary: calculateMatchSummary(matches),
      recentSessions: sessions.slice(0, 5).map(toRecentSession),
    };
  }
}

function emptyDashboard(period: PlayerDashboard['period'], from: Date): PlayerDashboard {
  return {
    period,
    totals: {
      sessions: 0,
      finishedSessions: 0,
      openSessions: 0,
      trainingMinutes: 0,
      drillExecutions: 0,
      attempts: 0,
      successes: 0,
      successRate: 0,
    },
    weeklyVolume: buildEmptyBuckets(from),
    drillProgress: [],
    matchSummary: emptyMatchSummary(),
    recentSessions: [],
  };
}

function calculateTotals(sessions: DashboardSession[]): PlayerDashboard['totals'] {
  const attempts = sum(sessions.flatMap((session) => session.drillExecutions), (execution) => execution.attempts);
  const successes = sum(sessions.flatMap((session) => session.drillExecutions), (execution) => execution.successes);

  return {
    sessions: sessions.length,
    finishedSessions: sessions.filter((session) => session.endedAt).length,
    openSessions: sessions.filter((session) => !session.endedAt).length,
    trainingMinutes: sum(sessions, sessionDurationMinutes),
    drillExecutions: sum(sessions, (session) => session.drillExecutions.length),
    attempts,
    successes,
    successRate: percent(successes, attempts),
  };
}

function calculateWeeklyVolume(sessions: DashboardSession[], from: Date): DashboardWeeklyPoint[] {
  const buckets = buildEmptyBuckets(from);

  for (const session of sessions) {
    const bucketIndex = Math.min(WEEK_BUCKETS - 1, Math.max(0, Math.floor((session.startedAt.getTime() - from.getTime()) / (7 * DAY_MS))));
    const bucket = buckets[bucketIndex];
    if (!bucket) continue;
    const attempts = sum(session.drillExecutions, (execution) => execution.attempts);
    const successes = sum(session.drillExecutions, (execution) => execution.successes);
    bucket.sessions += 1;
    bucket.trainingMinutes += sessionDurationMinutes(session);
    bucket.attempts += attempts;
    bucket.successes += successes;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    successRate: percent(bucket.successes, bucket.attempts),
  }));
}

function calculateDrillProgress(sessions: DashboardSession[]): DashboardDrillProgress[] {
  const aggregates = new Map<string, DrillAggregate>();

  for (const session of sessions) {
    for (const execution of session.drillExecutions) {
      const aggregate = aggregates.get(execution.drillTemplateId) ?? {
        drillTemplateId: execution.drillTemplateId,
        drillTemplateName: execution.drillTemplate.name,
        executions: 0,
        attempts: 0,
        successes: 0,
        lastPracticedAt: execution.startedAt,
      };
      aggregate.executions += 1;
      aggregate.attempts += execution.attempts;
      aggregate.successes += execution.successes;
      if (execution.startedAt > aggregate.lastPracticedAt) {
        aggregate.lastPracticedAt = execution.startedAt;
      }
      aggregates.set(execution.drillTemplateId, aggregate);
    }
  }

  return Array.from(aggregates.values())
    .sort((left, right) => right.attempts - left.attempts || right.lastPracticedAt.getTime() - left.lastPracticedAt.getTime())
    .slice(0, 8)
    .map((aggregate) => ({
      drillTemplateId: aggregate.drillTemplateId,
      drillTemplateName: aggregate.drillTemplateName,
      executions: aggregate.executions,
      attempts: aggregate.attempts,
      successes: aggregate.successes,
      successRate: percent(aggregate.successes, aggregate.attempts),
      lastPracticedAt: aggregate.lastPracticedAt.toISOString(),
    }));
}

function calculateMatchSummary(matches: DashboardMatch[]): PlayerDashboard['matchSummary'] {
  const wins = matches.filter((match) => match.result === 'PLAYER_WIN').length;
  const losses = matches.filter((match) => match.result === 'OPPONENT_WIN').length;
  const draws = matches.filter((match) => match.result === 'DRAW').length;
  const highBreaks = matches
    .map((match) => match.highBreak)
    .filter((value): value is number => value !== null);

  return {
    matches: matches.length,
    wins,
    losses,
    draws,
    framesWon: sum(matches, (match) => match.framesWon),
    framesLost: sum(matches, (match) => match.framesLost),
    winRate: percent(wins, matches.length),
    ...(highBreaks.length ? { highBreak: Math.max(...highBreaks) } : {}),
    breaks50: sum(matches, (match) => match.breaks50),
    breaks70: sum(matches, (match) => match.breaks70),
    breaks100: sum(matches, (match) => match.breaks100),
  };
}

function emptyMatchSummary(): PlayerDashboard['matchSummary'] {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    framesWon: 0,
    framesLost: 0,
    winRate: 0,
    breaks50: 0,
    breaks70: 0,
    breaks100: 0,
  };
}

function toRecentSession(session: DashboardSession): DashboardRecentSession {
  const attempts = sum(session.drillExecutions, (execution) => execution.attempts);
  const successes = sum(session.drillExecutions, (execution) => execution.successes);

  return {
    id: session.id,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    ...(session.endedAt ? { endedAt: session.endedAt.toISOString() } : {}),
    sessionType: fromPrismaSessionType(session.sessionType),
    drillExecutions: session.drillExecutions.length,
    attempts,
    successes,
    successRate: percent(successes, attempts),
  };
}

function buildEmptyBuckets(from: Date): DashboardWeeklyPoint[] {
  return Array.from({ length: WEEK_BUCKETS }, (_, index) => {
    const weekStart = addDays(from, index * 7);
    return {
      weekStart: weekStart.toISOString(),
      label: formatMonthDay(weekStart),
      sessions: 0,
      trainingMinutes: 0,
      attempts: 0,
      successes: 0,
      successRate: 0,
    };
  });
}

function sessionDurationMinutes(session: { startedAt: Date; endedAt: Date | null }): number {
  if (!session.endedAt || session.endedAt <= session.startedAt) return 0;
  return Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000);
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatMonthDay(value: Date): string {
  return `${String(value.getMonth() + 1).padStart(2, '0')}.${String(value.getDate()).padStart(2, '0')}`;
}

function fromPrismaSessionType(value: DashboardSession['sessionType']): DashboardRecentSession['sessionType'] {
  return {
    SOLO: 'solo',
    COACHED: 'coached',
    MATCH_PREP: 'match_prep',
    REVIEW: 'review',
    OTHER: 'other',
  }[value] as DashboardRecentSession['sessionType'];
}
