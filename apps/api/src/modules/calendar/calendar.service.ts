import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CalendarEventSource as PrismaCalendarEventSource,
  CalendarEventType as PrismaCalendarEventType,
  Prisma,
} from '@prisma/client';
import {
  ErrorCodes,
  type CalendarEvent,
  type CalendarEventSource,
  type CalendarEventType,
  type CreateCalendarEventInput,
  type CreateLifestyleFactorInput,
  type CreateSupplementEventInput,
  type LifestyleFactor,
  type SupplementEvent,
  type UpdateCalendarEventInput,
  type UpdateLifestyleFactorInput,
  type UpdateSupplementEventInput,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';

type CalendarEventEntity = Prisma.CalendarEventGetPayload<Record<string, never>>;
type LifestyleFactorEntity = Prisma.LifestyleFactorGetPayload<Record<string, never>>;
type SupplementEventEntity = Prisma.SupplementEventGetPayload<Record<string, never>>;
type ProfileRef = { id: string };

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async listCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    const profile = await this.findProfile(userId);
    if (!profile) return [];

    const events = await this.prisma.calendarEvent.findMany({
      where: { playerProfileId: profile.id },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return events.map(toCalendarEvent);
  }

  async getCalendarEvent(userId: string, id: string): Promise<CalendarEvent> {
    return toCalendarEvent(await this.findCalendarEventOrThrow(userId, id));
  }

  async createCalendarEvent(
    userId: string,
    input: CreateCalendarEventInput,
  ): Promise<CalendarEvent> {
    const profile = await this.findProfileOrThrow(userId);
    const data: Prisma.CalendarEventUncheckedCreateInput = {
      playerProfileId: profile.id,
      createdByUserId: userId,
      eventType: toPrismaCalendarEventType(input.eventType),
      title: input.title,
      source: 'MANUAL',
      startAt: parseDate(input.startAt),
    };

    assignOptional(data, 'description', input.description);
    assignDate(data, 'endAt', input.endAt);
    assignMetadata(data, input.metadata);

    const event = await this.prisma.calendarEvent.create({ data });
    return toCalendarEvent(event);
  }

  async updateCalendarEvent(
    userId: string,
    id: string,
    input: UpdateCalendarEventInput,
  ): Promise<CalendarEvent> {
    const existing = await this.findCalendarEventOrThrow(userId, id);
    const data: Prisma.CalendarEventUpdateInput = {};

    if (input.eventType !== undefined) data.eventType = toPrismaCalendarEventType(input.eventType);
    assignOptional(data, 'title', input.title);
    assignOptional(data, 'description', input.description);
    assignDate(data, 'startAt', input.startAt);
    assignDate(data, 'endAt', input.endAt);
    assignMetadata(data, input.metadata);

    const event = await this.prisma.calendarEvent.update({ where: { id: existing.id }, data });
    return toCalendarEvent(event);
  }

  async listLifestyleFactors(userId: string): Promise<LifestyleFactor[]> {
    const profile = await this.findProfile(userId);
    if (!profile) return [];

    const factors = await this.prisma.lifestyleFactor.findMany({
      where: { playerProfileId: profile.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });
    return factors.map(toLifestyleFactor);
  }

  async getLifestyleFactor(userId: string, id: string): Promise<LifestyleFactor> {
    return toLifestyleFactor(await this.findLifestyleFactorOrThrow(userId, id));
  }

  async saveLifestyleFactor(
    userId: string,
    input: CreateLifestyleFactorInput,
  ): Promise<LifestyleFactor> {
    const profile = await this.findProfileOrThrow(userId);
    const date = startOfDay(parseDate(input.date));
    const data = toLifestyleFactorData(input);
    const factor = await this.prisma.lifestyleFactor.upsert({
      where: { playerProfileId_date: { playerProfileId: profile.id, date } },
      create: toLifestyleFactorCreateData(profile.id, date, input),
      update: data,
    });
    return toLifestyleFactor(factor);
  }

  async updateLifestyleFactor(
    userId: string,
    id: string,
    input: UpdateLifestyleFactorInput,
  ): Promise<LifestyleFactor> {
    const existing = await this.findLifestyleFactorOrThrow(userId, id);
    const data = toLifestyleFactorData(input);
    if (input.date !== undefined) data.date = startOfDay(parseDate(input.date));

    const factor = await this.prisma.lifestyleFactor.update({ where: { id: existing.id }, data });
    return toLifestyleFactor(factor);
  }

  async listSupplementEvents(userId: string): Promise<SupplementEvent[]> {
    const profile = await this.findProfile(userId);
    if (!profile) return [];

    const events = await this.prisma.supplementEvent.findMany({
      where: { playerProfileId: profile.id },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return events.map(toSupplementEvent);
  }

  async getSupplementEvent(userId: string, id: string): Promise<SupplementEvent> {
    return toSupplementEvent(await this.findSupplementEventOrThrow(userId, id));
  }

  async createSupplementEvent(
    userId: string,
    input: CreateSupplementEventInput,
  ): Promise<SupplementEvent> {
    const profile = await this.findProfileOrThrow(userId);
    const event = await this.prisma.supplementEvent.create({
      data: toSupplementEventCreateData(profile.id, userId, input),
    });
    return toSupplementEvent(event);
  }

  async updateSupplementEvent(
    userId: string,
    id: string,
    input: UpdateSupplementEventInput,
  ): Promise<SupplementEvent> {
    const existing = await this.findSupplementEventOrThrow(userId, id);
    const event = await this.prisma.supplementEvent.update({
      where: { id: existing.id },
      data: toSupplementEventData(input),
    });
    return toSupplementEvent(event);
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

  private async findCalendarEventOrThrow(userId: string, id: string): Promise<CalendarEventEntity> {
    const profile = await this.findProfileOrThrow(userId);
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, playerProfileId: profile.id },
    });
    if (!event) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return event;
  }

  private async findLifestyleFactorOrThrow(
    userId: string,
    id: string,
  ): Promise<LifestyleFactorEntity> {
    const profile = await this.findProfileOrThrow(userId);
    const factor = await this.prisma.lifestyleFactor.findFirst({
      where: { id, playerProfileId: profile.id },
    });
    if (!factor) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return factor;
  }

  private async findSupplementEventOrThrow(
    userId: string,
    id: string,
  ): Promise<SupplementEventEntity> {
    const profile = await this.findProfileOrThrow(userId);
    const event = await this.prisma.supplementEvent.findFirst({
      where: { id, playerProfileId: profile.id },
    });
    if (!event) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return event;
  }
}

function toLifestyleFactorData(
  input: CreateLifestyleFactorInput | UpdateLifestyleFactorInput,
): Prisma.LifestyleFactorUpdateInput {
  const data: Prisma.LifestyleFactorUpdateInput = {};
  assignOptional(data, 'sleepHours', input.sleepHours);
  assignOptional(data, 'sleepQuality', input.sleepQuality);
  assignOptional(data, 'fatigue', input.fatigue);
  assignOptional(data, 'stress', input.stress);
  assignOptional(data, 'focus', input.focus);
  assignOptional(data, 'mood', input.mood);
  assignOptional(data, 'illness', input.illness);
  assignOptional(data, 'injury', input.injury);
  assignOptional(data, 'travel', input.travel);
  assignOptional(data, 'notes', input.notes);
  return data;
}

function toLifestyleFactorCreateData(
  playerProfileId: string,
  date: Date,
  input: CreateLifestyleFactorInput,
): Prisma.LifestyleFactorUncheckedCreateInput {
  return {
    playerProfileId,
    date,
    sleepHours: input.sleepHours ?? null,
    sleepQuality: input.sleepQuality ?? null,
    fatigue: input.fatigue ?? null,
    stress: input.stress ?? null,
    focus: input.focus ?? null,
    mood: input.mood ?? null,
    illness: input.illness ?? false,
    injury: input.injury ?? false,
    travel: input.travel ?? false,
    notes: input.notes ?? null,
  };
}

function toSupplementEventCreateData(
  playerProfileId: string,
  createdByUserId: string,
  input: CreateSupplementEventInput,
): Prisma.SupplementEventUncheckedCreateInput {
  const data: Prisma.SupplementEventUncheckedCreateInput = {
    playerProfileId,
    createdByUserId,
    name: input.name,
    startDate: parseDate(input.startDate),
  };
  assignOptional(data, 'category', input.category);
  assignDate(data, 'endDate', input.endDate);
  assignOptional(data, 'dosageNote', input.dosageNote);
  assignOptional(data, 'reason', input.reason);
  assignOptional(data, 'notes', input.notes);
  return data;
}

function toSupplementEventData(
  input: UpdateSupplementEventInput,
): Prisma.SupplementEventUpdateInput {
  const data: Prisma.SupplementEventUpdateInput = {};
  assignOptional(data, 'name', input.name);
  assignOptional(data, 'category', input.category);
  assignDate(data, 'startDate', input.startDate);
  assignDate(data, 'endDate', input.endDate);
  assignOptional(data, 'dosageNote', input.dosageNote);
  assignOptional(data, 'reason', input.reason);
  assignOptional(data, 'notes', input.notes);
  return data;
}

function toCalendarEvent(event: CalendarEventEntity): CalendarEvent {
  const metadata = toMetadata(event.metadataJson);
  return {
    id: event.id,
    playerProfileId: event.playerProfileId,
    createdByUserId: event.createdByUserId,
    eventType: fromPrismaCalendarEventType(event.eventType),
    title: event.title,
    ...(event.description ? { description: event.description } : {}),
    startAt: event.startAt.toISOString(),
    ...(event.endAt ? { endAt: event.endAt.toISOString() } : {}),
    source: fromPrismaCalendarEventSource(event.source),
    ...(metadata ? { metadata } : {}),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function toLifestyleFactor(factor: LifestyleFactorEntity): LifestyleFactor {
  return {
    id: factor.id,
    playerProfileId: factor.playerProfileId,
    date: factor.date.toISOString(),
    ...(factor.sleepHours !== null ? { sleepHours: factor.sleepHours } : {}),
    ...(factor.sleepQuality !== null ? { sleepQuality: factor.sleepQuality } : {}),
    ...(factor.fatigue !== null ? { fatigue: factor.fatigue } : {}),
    ...(factor.stress !== null ? { stress: factor.stress } : {}),
    ...(factor.focus !== null ? { focus: factor.focus } : {}),
    ...(factor.mood ? { mood: factor.mood } : {}),
    illness: factor.illness,
    injury: factor.injury,
    travel: factor.travel,
    ...(factor.notes ? { notes: factor.notes } : {}),
    createdAt: factor.createdAt.toISOString(),
    updatedAt: factor.updatedAt.toISOString(),
  };
}

function toSupplementEvent(event: SupplementEventEntity): SupplementEvent {
  return {
    id: event.id,
    playerProfileId: event.playerProfileId,
    createdByUserId: event.createdByUserId,
    name: event.name,
    ...(event.category ? { category: event.category } : {}),
    startDate: event.startDate.toISOString(),
    ...(event.endDate ? { endDate: event.endDate.toISOString() } : {}),
    ...(event.dosageNote ? { dosageNote: event.dosageNote } : {}),
    ...(event.reason ? { reason: event.reason } : {}),
    ...(event.notes ? { notes: event.notes } : {}),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function assignOptional<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function assignDate<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: string | undefined,
): void {
  if (value !== undefined) {
    target[key] = parseDate(value) as T[K];
  }
}

function assignMetadata<T extends { metadataJson?: unknown }>(
  target: T,
  metadata: Record<string, unknown> | undefined,
): void {
  if (metadata !== undefined) {
    target.metadataJson = metadata as Prisma.InputJsonValue;
  }
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

function toMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function toPrismaCalendarEventType(type: CalendarEventType): PrismaCalendarEventType {
  return calendarEventTypeMap[type];
}

function fromPrismaCalendarEventType(type: PrismaCalendarEventType): CalendarEventType {
  return reverseCalendarEventTypeMap[type];
}

function fromPrismaCalendarEventSource(source: PrismaCalendarEventSource): CalendarEventSource {
  return reverseCalendarEventSourceMap[source];
}

const calendarEventTypeMap: Record<CalendarEventType, PrismaCalendarEventType> = {
  training: 'TRAINING',
  tournament: 'TOURNAMENT',
  match: 'MATCH',
  travel: 'TRAVEL',
  rest_day: 'REST_DAY',
  illness: 'ILLNESS',
  injury: 'INJURY',
  equipment_change: 'EQUIPMENT_CHANGE',
  coach_change: 'COACH_CHANGE',
  supplement_start: 'SUPPLEMENT_START',
  supplement_end: 'SUPPLEMENT_END',
  sleep_issue: 'SLEEP_ISSUE',
  school_workload: 'SCHOOL_WORKLOAD',
  custom_factor: 'CUSTOM_FACTOR',
};

const reverseCalendarEventTypeMap = Object.fromEntries(
  Object.entries(calendarEventTypeMap).map(([key, value]) => [value, key]),
) as Record<PrismaCalendarEventType, CalendarEventType>;

const calendarEventSourceMap: Record<CalendarEventSource, PrismaCalendarEventSource> = {
  manual: 'MANUAL',
  external: 'EXTERNAL',
};

const reverseCalendarEventSourceMap = Object.fromEntries(
  Object.entries(calendarEventSourceMap).map(([key, value]) => [value, key]),
) as Record<PrismaCalendarEventSource, CalendarEventSource>;
