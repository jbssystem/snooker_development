import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCodes,
  type AddDrillExecutionInput,
  type CreateDrillAttemptInput,
  type CreateTrainingSessionInput,
  type DrillAttempt,
  type DrillAttemptResult,
  type DrillExecution,
  type FinishDrillExecutionInput,
  type FinishTrainingSessionInput,
  type TableLayout,
  type TrainingSession,
  type TrainingSessionType,
  type UpdateTrainingSessionInput,
} from '@snooker/shared';
import {
  DrillAttemptResult as PrismaDrillAttemptResult,
  DrillVisibility,
  Prisma,
  TrainingSessionType as PrismaTrainingSessionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import type { ProfileContext } from '../profiles/profile-context';

type SessionWithExecutions = Prisma.TrainingSessionGetPayload<{
  include: {
    drillExecutions: {
      include: {
        drillTemplate: true;
        attemptsLog: { orderBy: { attemptNumber: 'asc' } };
      };
      orderBy: { startedAt: 'asc' };
    };
  };
}>;

type ExecutionWithAttempts = Prisma.DrillExecutionGetPayload<{
  include: {
    drillTemplate: true;
    attemptsLog: { orderBy: { attemptNumber: 'asc' } };
  };
}>;

type AttemptEntity = Prisma.DrillAttemptGetPayload<Record<string, never>>;

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(profileId: string): Promise<TrainingSession[]> {
    const sessions = await this.prisma.trainingSession.findMany({
      where: { playerProfileId: profileId },
      include: sessionInclude,
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return sessions.map(mapTrainingSession);
  }

  async getSession(profileId: string, id: string): Promise<TrainingSession> {
    const session = await this.findSessionOrThrow(profileId, id);

    return mapTrainingSession(session);
  }

  async createSession(ctx: ProfileContext, input: CreateTrainingSessionInput): Promise<TrainingSession> {
    const data: Prisma.TrainingSessionCreateInput = {
      playerProfile: { connect: { id: ctx.profileId } },
      createdBy: { connect: { id: ctx.userId } },
      title: input.title,
      sessionType: toPrismaSessionType(input.sessionType),
    };

    assignDate(data, 'startedAt', input.startedAt);
    assignOptional(data, 'goal', input.goal);
    assignOptional(data, 'intensity', input.intensity);
    assignOptional(data, 'fatigueBefore', input.fatigueBefore);
    assignOptional(data, 'focusLevel', input.focusLevel);
    assignOptional(data, 'mood', input.mood);
    assignOptional(data, 'notes', input.notes);

    const session = await this.prisma.trainingSession.create({
      data,
      include: sessionInclude,
    });

    return mapTrainingSession(session);
  }

  async updateSession(
    profileId: string,
    id: string,
    input: UpdateTrainingSessionInput,
  ): Promise<TrainingSession> {
    await this.findSessionOrThrow(profileId, id);
    const data: Prisma.TrainingSessionUpdateInput = {};

    assignOptional(data, 'title', input.title);
    if (input.sessionType !== undefined) {
      data.sessionType = toPrismaSessionType(input.sessionType);
    }
    assignOptional(data, 'goal', input.goal);
    assignOptional(data, 'intensity', input.intensity);
    assignOptional(data, 'fatigueBefore', input.fatigueBefore);
    assignOptional(data, 'fatigueAfter', input.fatigueAfter);
    assignOptional(data, 'focusLevel', input.focusLevel);
    assignOptional(data, 'mood', input.mood);
    assignOptional(data, 'notes', input.notes);
    assignDate(data, 'endedAt', input.endedAt);

    const session = await this.prisma.trainingSession.update({
      where: { id },
      data,
      include: sessionInclude,
    });

    return mapTrainingSession(session);
  }

  async finishSession(
    profileId: string,
    id: string,
    input: FinishTrainingSessionInput,
  ): Promise<TrainingSession> {
    const existing = await this.findSessionOrThrow(profileId, id);
    if (existing.endedAt) {
      return mapTrainingSession(existing);
    }
    const data: Prisma.TrainingSessionUpdateInput = {
      endedAt: new Date(),
    };
    assignOptional(data, 'fatigueAfter', input.fatigueAfter);
    assignOptional(data, 'notes', input.notes);

    const session = await this.prisma.trainingSession.update({
      where: { id },
      data,
      include: sessionInclude,
    });

    return mapTrainingSession(session);
  }

  async addDrill(
    ctx: ProfileContext,
    sessionId: string,
    input: AddDrillExecutionInput,
  ): Promise<DrillExecution> {
    const session = await this.findSessionOrThrow(ctx.profileId, sessionId);
    assertOpen(session.endedAt);
    const drillTemplate = await this.findVisibleDrillTemplateOrThrow(ctx.userId, input.drillTemplateId);
    const data: Prisma.DrillExecutionCreateInput = {
      trainingSession: { connect: { id: session.id } },
      drillTemplate: { connect: { id: drillTemplate.id } },
      playerProfile: { connect: { id: session.playerProfileId } },
    };

    if (input.tableLayoutSnapshot !== undefined) {
      data.tableLayoutSnapshotJson = input.tableLayoutSnapshot as Prisma.InputJsonValue;
    } else if (drillTemplate.defaultTableLayoutJson !== null) {
      data.tableLayoutSnapshotJson = drillTemplate.defaultTableLayoutJson as Prisma.InputJsonValue;
    }

    const execution = await this.prisma.drillExecution.create({
      data,
      include: executionInclude,
    });

    return mapDrillExecution(execution);
  }

  async addAttempt(
    profileId: string,
    executionId: string,
    input: CreateDrillAttemptInput,
  ): Promise<DrillAttempt> {
    const execution = await this.findExecutionOrThrow(profileId, executionId);
    assertOpen(execution.endedAt);

    const attempt = await withSerializableRetry(this.prisma, async (tx) => {
      const lastAttempt = await tx.drillAttempt.findFirst({
        where: { drillExecutionId: execution.id },
        orderBy: { attemptNumber: 'desc' },
      });
      const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;
      const attemptData: Prisma.DrillAttemptCreateInput = {
        drillExecution: { connect: { id: execution.id } },
        attemptNumber,
        result: toPrismaAttemptResult(input.result),
      };

      assignOptional(attemptData, 'score', input.score);
      assignOptional(attemptData, 'potSuccess', input.potSuccess);
      assignOptional(attemptData, 'positionSuccess', input.positionSuccess);
      assignOptional(attemptData, 'missType', input.missType);
      assignOptional(attemptData, 'errorTags', input.errorTags);
      assignOptional(attemptData, 'shotTimeMs', input.shotTimeMs);
      assignOptional(attemptData, 'notes', input.notes);

      const created = await tx.drillAttempt.create({ data: attemptData });
      const isSuccess = input.result === 'success';
      const executionUpdate: Prisma.DrillExecutionUpdateInput = {
        attempts: { increment: 1 },
      };
      if (isSuccess) {
        executionUpdate.successes = { increment: 1 };
      }
      await tx.drillExecution.update({
        where: { id: execution.id },
        data: executionUpdate,
      });

      return created;
    });

    return mapDrillAttempt(attempt);
  }

  async removeLastAttempt(profileId: string, executionId: string): Promise<DrillExecution> {
    const execution = await this.findExecutionOrThrow(profileId, executionId);
    assertOpen(execution.endedAt);

    await withSerializableRetry(this.prisma, async (tx) => {
      const lastAttempt = await tx.drillAttempt.findFirst({
        where: { drillExecutionId: execution.id },
        orderBy: { attemptNumber: 'desc' },
      });
      if (!lastAttempt) {
        return;
      }
      await tx.drillAttempt.delete({ where: { id: lastAttempt.id } });
      const executionUpdate: Prisma.DrillExecutionUpdateInput = {
        attempts: { decrement: 1 },
      };
      if (lastAttempt.result === PrismaDrillAttemptResult.SUCCESS) {
        executionUpdate.successes = { decrement: 1 };
      }
      await tx.drillExecution.update({
        where: { id: execution.id },
        data: executionUpdate,
      });
    });

    const refreshed = await this.findExecutionOrThrow(profileId, executionId);
    return mapDrillExecution(refreshed);
  }

  async finishDrill(
    profileId: string,
    executionId: string,
    input: FinishDrillExecutionInput,
  ): Promise<DrillExecution> {
    const existing = await this.findExecutionOrThrow(profileId, executionId);
    if (existing.endedAt) {
      return mapDrillExecution(existing);
    }
    const data: Prisma.DrillExecutionUpdateInput = {
      endedAt: new Date(),
    };

    assignOptional(data, 'score', input.score);
    assignOptional(data, 'maxRun', input.maxRun);
    assignOptional(data, 'averageScore', input.averageScore);
    assignOptional(data, 'resultJson', input.result as Prisma.InputJsonValue | undefined);
    assignOptional(data, 'errorTags', input.errorTags);
    assignOptional(data, 'coachNotes', input.coachNotes);
    assignOptional(data, 'playerNotes', input.playerNotes);

    const execution = await this.prisma.drillExecution.update({
      where: { id: executionId },
      data,
      include: executionInclude,
    });

    return mapDrillExecution(execution);
  }

  private async findSessionOrThrow(profileId: string, id: string): Promise<SessionWithExecutions> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id, playerProfileId: profileId },
      include: sessionInclude,
    });

    if (!session) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }

    return session;
  }

  private async findExecutionOrThrow(profileId: string, id: string): Promise<ExecutionWithAttempts> {
    const execution = await this.prisma.drillExecution.findFirst({
      where: { id, playerProfileId: profileId },
      include: executionInclude,
    });

    if (!execution) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }

    return execution;
  }

  private async findVisibleDrillTemplateOrThrow(userId: string, id: string) {
    const drillTemplate = await this.prisma.drillTemplate.findFirst({
      where: {
        id,
        OR: [
          { createdByUserId: userId },
          { visibility: DrillVisibility.SHARED },
          { visibility: DrillVisibility.SYSTEM },
        ],
      },
    });

    if (!drillTemplate) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }

    return drillTemplate;
  }
}

const sessionInclude = {
  drillExecutions: {
    include: {
      drillTemplate: true,
      attemptsLog: { orderBy: { attemptNumber: 'asc' } },
    },
    orderBy: { startedAt: 'asc' },
  },
} satisfies Prisma.TrainingSessionInclude;

const executionInclude = {
  drillTemplate: true,
  attemptsLog: { orderBy: { attemptNumber: 'asc' } },
} satisfies Prisma.DrillExecutionInclude;

function assignOptional<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function assignDate<T extends object, K extends keyof T>(target: T, key: K, value: string | undefined): void {
  if (value !== undefined) {
    target[key] = new Date(value) as T[K];
  }
}

function assertOpen(endedAt: Date | null): void {
  if (endedAt) {
    throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
  }
}

async function withSerializableRetry<T>(
  prisma: PrismaService,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt === 2) {
        if (isUniqueConflict(error)) {
          throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
        }
        throw error;
      }
    }
  }
  throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
}

function isRetryableTransactionConflict(error: unknown): boolean {
  return isPrismaCode(error, 'P2034') || isUniqueConflict(error);
}

function isUniqueConflict(error: unknown): boolean {
  return isPrismaCode(error, 'P2002');
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}

function mapTrainingSession(session: SessionWithExecutions): TrainingSession {
  return {
    id: session.id,
    playerProfileId: session.playerProfileId,
    createdByUserId: session.createdByUserId,
    startedAt: session.startedAt.toISOString(),
    ...(session.endedAt ? { endedAt: session.endedAt.toISOString() } : {}),
    sessionType: fromPrismaSessionType(session.sessionType),
    title: session.title,
    ...(session.goal ? { goal: session.goal } : {}),
    ...(session.intensity !== null ? { intensity: session.intensity } : {}),
    ...(session.fatigueBefore !== null ? { fatigueBefore: session.fatigueBefore } : {}),
    ...(session.fatigueAfter !== null ? { fatigueAfter: session.fatigueAfter } : {}),
    ...(session.focusLevel !== null ? { focusLevel: session.focusLevel } : {}),
    ...(session.mood ? { mood: session.mood } : {}),
    ...(session.notes ? { notes: session.notes } : {}),
    drillExecutions: session.drillExecutions.map(mapDrillExecution),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function mapDrillExecution(execution: ExecutionWithAttempts): DrillExecution {
  return {
    id: execution.id,
    trainingSessionId: execution.trainingSessionId,
    drillTemplateId: execution.drillTemplateId,
    playerProfileId: execution.playerProfileId,
    drillTemplateName: execution.drillTemplate.name,
    startedAt: execution.startedAt.toISOString(),
    ...(execution.endedAt ? { endedAt: execution.endedAt.toISOString() } : {}),
    attempts: execution.attempts,
    successes: execution.successes,
    ...(execution.score !== null ? { score: execution.score } : {}),
    ...(execution.maxRun !== null ? { maxRun: execution.maxRun } : {}),
    ...(execution.averageScore !== null ? { averageScore: execution.averageScore } : {}),
    ...(execution.resultJson !== null ? { result: execution.resultJson } : {}),
    errorTags: execution.errorTags,
    ...(execution.coachNotes ? { coachNotes: execution.coachNotes } : {}),
    ...(execution.playerNotes ? { playerNotes: execution.playerNotes } : {}),
    ...(execution.tableLayoutSnapshotJson !== null
      ? { tableLayoutSnapshot: execution.tableLayoutSnapshotJson as TableLayout }
      : {}),
    attemptsLog: execution.attemptsLog.map(mapDrillAttempt),
    createdAt: execution.createdAt.toISOString(),
    updatedAt: execution.updatedAt.toISOString(),
  };
}

function mapDrillAttempt(attempt: AttemptEntity): DrillAttempt {
  return {
    id: attempt.id,
    drillExecutionId: attempt.drillExecutionId,
    attemptNumber: attempt.attemptNumber,
    result: fromPrismaAttemptResult(attempt.result),
    ...(attempt.score !== null ? { score: attempt.score } : {}),
    ...(attempt.potSuccess !== null ? { potSuccess: attempt.potSuccess } : {}),
    ...(attempt.positionSuccess !== null ? { positionSuccess: attempt.positionSuccess } : {}),
    ...(attempt.missType ? { missType: attempt.missType } : {}),
    errorTags: attempt.errorTags,
    ...(attempt.shotTimeMs !== null ? { shotTimeMs: attempt.shotTimeMs } : {}),
    ...(attempt.notes ? { notes: attempt.notes } : {}),
    createdAt: attempt.createdAt.toISOString(),
  };
}

function toPrismaSessionType(value: TrainingSessionType): PrismaTrainingSessionType {
  return {
    solo: PrismaTrainingSessionType.SOLO,
    coached: PrismaTrainingSessionType.COACHED,
    match_prep: PrismaTrainingSessionType.MATCH_PREP,
    review: PrismaTrainingSessionType.REVIEW,
    other: PrismaTrainingSessionType.OTHER,
  }[value];
}

function fromPrismaSessionType(value: PrismaTrainingSessionType): TrainingSessionType {
  return {
    [PrismaTrainingSessionType.SOLO]: 'solo',
    [PrismaTrainingSessionType.COACHED]: 'coached',
    [PrismaTrainingSessionType.MATCH_PREP]: 'match_prep',
    [PrismaTrainingSessionType.REVIEW]: 'review',
    [PrismaTrainingSessionType.OTHER]: 'other',
  }[value] as TrainingSessionType;
}

function toPrismaAttemptResult(value: DrillAttemptResult): PrismaDrillAttemptResult {
  return {
    success: PrismaDrillAttemptResult.SUCCESS,
    partial: PrismaDrillAttemptResult.PARTIAL,
    miss: PrismaDrillAttemptResult.MISS,
    skipped: PrismaDrillAttemptResult.SKIPPED,
  }[value];
}

function fromPrismaAttemptResult(value: PrismaDrillAttemptResult): DrillAttemptResult {
  return {
    [PrismaDrillAttemptResult.SUCCESS]: 'success',
    [PrismaDrillAttemptResult.PARTIAL]: 'partial',
    [PrismaDrillAttemptResult.MISS]: 'miss',
    [PrismaDrillAttemptResult.SKIPPED]: 'skipped',
  }[value] as DrillAttemptResult;
}
