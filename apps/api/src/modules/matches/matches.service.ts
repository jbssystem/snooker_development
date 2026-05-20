import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FrameWinner as PrismaFrameWinner,
  MatchResult as PrismaMatchResult,
  MatchSource as PrismaMatchSource,
  Prisma,
} from '@prisma/client';
import {
  ErrorCodes,
  type AddMatchFrameInput,
  type CreateMatchInput,
  type FrameWinner,
  type Match,
  type MatchFrame,
  type MatchResult,
  type MatchSource,
  type UpdateMatchInput,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';

type MatchWithFrames = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;
type MatchFrameEntity = Prisma.MatchFrameGetPayload<Record<string, never>>;

type ProfileRef = { id: string };

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Match[]> {
    const profile = await this.findProfile(userId);
    if (!profile) return [];

    const matches = await this.prisma.match.findMany({
      where: { playerProfileId: profile.id },
      include: matchInclude,
      orderBy: [{ matchDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return matches.map(toMatch);
  }

  async get(userId: string, id: string): Promise<Match> {
    return toMatch(await this.findMatchOrThrow(userId, id));
  }

  async create(userId: string, input: CreateMatchInput): Promise<Match> {
    const profile = await this.findProfileOrThrow(userId);
    const framesWon = input.framesWon ?? 0;
    const framesLost = input.framesLost ?? 0;
    const data: Prisma.MatchUncheckedCreateInput = {
      playerProfileId: profile.id,
      createdByUserId: userId,
      opponentName: input.opponentName,
      framesWon,
      framesLost,
      breaks50: input.breaks50 ?? 0,
      breaks70: input.breaks70 ?? 0,
      breaks100: input.breaks100 ?? 0,
      result: toPrismaMatchResult(input.result ?? resultFromScore(framesWon, framesLost)),
      source: 'MANUAL',
    };

    assignDate(data, 'matchDate', input.matchDate);
    assignOptional(data, 'tournament', input.tournament);
    assignOptional(data, 'country', input.country);
    assignOptional(data, 'city', input.city);
    assignOptional(data, 'club', input.club);
    assignOptional(data, 'opponentExternalId', input.opponentExternalId);
    assignOptional(data, 'round', input.round);
    assignOptional(data, 'format', input.format);
    assignOptional(data, 'highBreak', input.highBreak);
    assignFrameWinner(data, 'decidingFrameResult', input.decidingFrameResult);
    assignOptional(data, 'safetySuccess', input.safetySuccess);
    assignOptional(data, 'longPotSuccess', input.longPotSuccess);
    assignOptional(data, 'unforcedErrors', input.unforcedErrors);
    assignOptional(data, 'tacticalErrors', input.tacticalErrors);
    assignOptional(data, 'sourceUrl', input.sourceUrl);
    assignOptional(data, 'videoUrl', input.videoUrl);
    assignOptional(data, 'notes', input.notes);

    const match = await this.prisma.match.create({ data, include: matchInclude });
    return toMatch(match);
  }

  async update(userId: string, id: string, input: UpdateMatchInput): Promise<Match> {
    const existing = await this.findMatchOrThrow(userId, id);
    const data: Prisma.MatchUpdateInput = {};

    assignDate(data, 'matchDate', input.matchDate);
    assignOptional(data, 'tournament', input.tournament);
    assignOptional(data, 'country', input.country);
    assignOptional(data, 'city', input.city);
    assignOptional(data, 'club', input.club);
    assignOptional(data, 'opponentName', input.opponentName);
    assignOptional(data, 'opponentExternalId', input.opponentExternalId);
    assignOptional(data, 'round', input.round);
    assignOptional(data, 'format', input.format);
    assignOptional(data, 'framesWon', input.framesWon);
    assignOptional(data, 'framesLost', input.framesLost);
    assignOptional(data, 'highBreak', input.highBreak);
    assignOptional(data, 'breaks50', input.breaks50);
    assignOptional(data, 'breaks70', input.breaks70);
    assignOptional(data, 'breaks100', input.breaks100);
    assignFrameWinner(data, 'decidingFrameResult', input.decidingFrameResult);
    assignOptional(data, 'safetySuccess', input.safetySuccess);
    assignOptional(data, 'longPotSuccess', input.longPotSuccess);
    assignOptional(data, 'unforcedErrors', input.unforcedErrors);
    assignOptional(data, 'tacticalErrors', input.tacticalErrors);
    assignOptional(data, 'sourceUrl', input.sourceUrl);
    assignOptional(data, 'videoUrl', input.videoUrl);
    assignOptional(data, 'notes', input.notes);

    if (input.result !== undefined) {
      data.result = toPrismaMatchResult(input.result);
    } else if (input.framesWon !== undefined || input.framesLost !== undefined) {
      data.result = toPrismaMatchResult(
        resultFromScore(input.framesWon ?? existing.framesWon, input.framesLost ?? existing.framesLost),
      );
    }

    const match = await this.prisma.match.update({ where: { id: existing.id }, data, include: matchInclude });
    return toMatch(match);
  }

  async addFrame(userId: string, id: string, input: AddMatchFrameInput): Promise<MatchFrame> {
    const match = await this.findMatchOrThrow(userId, id);
    const frameNumber = input.frameNumber ?? nextFrameNumber(match.frames);

    if (match.frames.some((frame) => frame.frameNumber === frameNumber)) {
      throw new BadRequestException({ error: { code: ErrorCodes.Validation.Failed } });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const frame = await tx.matchFrame.create({
        data: {
          matchId: match.id,
          frameNumber,
          playerScore: input.playerScore ?? null,
          opponentScore: input.opponentScore ?? null,
          winner: toPrismaFrameWinner(input.winner),
          highBreak: input.highBreak ?? null,
          frameDurationSec: input.frameDurationSec ?? null,
          notes: input.notes ?? null,
        },
      });
      const frames = await tx.matchFrame.findMany({
        where: { matchId: match.id },
        orderBy: { frameNumber: 'asc' },
      });
      const summary = frameSummary(frames);
      await tx.match.update({
        where: { id: match.id },
        data: {
          framesWon: summary.framesWon,
          framesLost: summary.framesLost,
          result: toPrismaMatchResult(resultFromScore(summary.framesWon, summary.framesLost)),
        },
      });
      return toMatchFrame(frame);
    });
  }

  private async findProfile(userId: string): Promise<ProfileRef | null> {
    return this.prisma.playerProfile.findUnique({ where: { userId }, select: { id: true } });
  }

  private async findProfileOrThrow(userId: string): Promise<ProfileRef> {
    const profile = await this.findProfile(userId);
    if (!profile) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return profile;
  }

  private async findMatchOrThrow(userId: string, id: string): Promise<MatchWithFrames> {
    const profile = await this.findProfileOrThrow(userId);
    const match = await this.prisma.match.findFirst({
      where: { id, playerProfileId: profile.id },
      include: matchInclude,
    });

    if (!match) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }

    return match;
  }
}

const matchInclude = {
  frames: { orderBy: { frameNumber: 'asc' } },
} satisfies Prisma.MatchInclude;

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

function assignFrameWinner<T extends object, K extends keyof T>(target: T, key: K, value: FrameWinner | undefined): void {
  if (value !== undefined) {
    target[key] = toPrismaFrameWinner(value) as T[K];
  }
}

function toMatch(match: MatchWithFrames): Match {
  return {
    id: match.id,
    playerProfileId: match.playerProfileId,
    createdByUserId: match.createdByUserId,
    matchDate: match.matchDate.toISOString(),
    ...(match.tournament ? { tournament: match.tournament } : {}),
    ...(match.country ? { country: match.country } : {}),
    ...(match.city ? { city: match.city } : {}),
    ...(match.club ? { club: match.club } : {}),
    opponentName: match.opponentName,
    ...(match.opponentExternalId ? { opponentExternalId: match.opponentExternalId } : {}),
    ...(match.round ? { round: match.round } : {}),
    ...(match.format ? { format: match.format } : {}),
    framesWon: match.framesWon,
    framesLost: match.framesLost,
    ...(match.highBreak !== null ? { highBreak: match.highBreak } : {}),
    breaks50: match.breaks50,
    breaks70: match.breaks70,
    breaks100: match.breaks100,
    ...(match.decidingFrameResult ? { decidingFrameResult: fromPrismaFrameWinner(match.decidingFrameResult) } : {}),
    ...(match.safetySuccess !== null ? { safetySuccess: match.safetySuccess } : {}),
    ...(match.longPotSuccess !== null ? { longPotSuccess: match.longPotSuccess } : {}),
    ...(match.unforcedErrors !== null ? { unforcedErrors: match.unforcedErrors } : {}),
    ...(match.tacticalErrors !== null ? { tacticalErrors: match.tacticalErrors } : {}),
    result: fromPrismaMatchResult(match.result),
    source: fromPrismaMatchSource(match.source),
    ...(match.sourceUrl ? { sourceUrl: match.sourceUrl } : {}),
    ...(match.videoUrl ? { videoUrl: match.videoUrl } : {}),
    ...(match.notes ? { notes: match.notes } : {}),
    frames: match.frames.map(toMatchFrame),
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
  };
}

function toMatchFrame(frame: MatchFrameEntity): MatchFrame {
  return {
    id: frame.id,
    matchId: frame.matchId,
    frameNumber: frame.frameNumber,
    ...(frame.playerScore !== null ? { playerScore: frame.playerScore } : {}),
    ...(frame.opponentScore !== null ? { opponentScore: frame.opponentScore } : {}),
    winner: fromPrismaFrameWinner(frame.winner),
    ...(frame.highBreak !== null ? { highBreak: frame.highBreak } : {}),
    ...(frame.frameDurationSec !== null ? { frameDurationSec: frame.frameDurationSec } : {}),
    ...(frame.notes ? { notes: frame.notes } : {}),
    createdAt: frame.createdAt.toISOString(),
  };
}

function nextFrameNumber(frames: Array<{ frameNumber: number }>): number {
  return (frames.at(-1)?.frameNumber ?? 0) + 1;
}

function frameSummary(frames: MatchFrameEntity[]): { framesWon: number; framesLost: number } {
  return {
    framesWon: frames.filter((frame) => frame.winner === 'PLAYER').length,
    framesLost: frames.filter((frame) => frame.winner === 'OPPONENT').length,
  };
}

function resultFromScore(framesWon: number, framesLost: number): MatchResult {
  if (framesWon > framesLost) return 'player_win';
  if (framesLost > framesWon) return 'opponent_win';
  if (framesWon === 0 && framesLost === 0) return 'unknown';
  return 'draw';
}

function toPrismaMatchResult(result: MatchResult): PrismaMatchResult {
  return matchResultMap[result];
}

function fromPrismaMatchResult(result: PrismaMatchResult): MatchResult {
  return reverseMatchResultMap[result];
}

function fromPrismaMatchSource(source: PrismaMatchSource): MatchSource {
  return reverseMatchSourceMap[source];
}

function toPrismaFrameWinner(winner: FrameWinner): PrismaFrameWinner {
  return frameWinnerMap[winner];
}

function fromPrismaFrameWinner(winner: PrismaFrameWinner): FrameWinner {
  return reverseFrameWinnerMap[winner];
}

const matchResultMap: Record<MatchResult, PrismaMatchResult> = {
  player_win: 'PLAYER_WIN',
  opponent_win: 'OPPONENT_WIN',
  draw: 'DRAW',
  unknown: 'UNKNOWN',
};

const reverseMatchResultMap = Object.fromEntries(
  Object.entries(matchResultMap).map(([key, value]) => [value, key]),
) as Record<PrismaMatchResult, MatchResult>;

const matchSourceMap: Record<MatchSource, PrismaMatchSource> = {
  manual: 'MANUAL',
  external: 'EXTERNAL',
};

const reverseMatchSourceMap = Object.fromEntries(
  Object.entries(matchSourceMap).map(([key, value]) => [value, key]),
) as Record<PrismaMatchSource, MatchSource>;

const frameWinnerMap: Record<FrameWinner, PrismaFrameWinner> = {
  player: 'PLAYER',
  opponent: 'OPPONENT',
  unknown: 'UNKNOWN',
};

const reverseFrameWinnerMap = Object.fromEntries(
  Object.entries(frameWinnerMap).map(([key, value]) => [value, key]),
) as Record<PrismaFrameWinner, FrameWinner>;
