import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  EquipmentProfile as PrismaEquipmentProfile,
  PlayerProfile as PrismaPlayerProfile,
  Prisma,
} from '@prisma/client';
import {
  ErrorCodes,
  type CreateEquipmentProfileInput,
  type EquipmentProfile,
  type PlayerProfile,
  type UpsertPlayerProfileInput,
  type UpdateEquipmentProfileInput,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<PlayerProfile | null> {
    const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
    return profile ? toPlayerProfile(profile) : null;
  }

  async upsertProfile(userId: string, input: UpsertPlayerProfileInput): Promise<PlayerProfile> {
    const data = toPlayerProfileData(input);
    const profile = await this.prisma.playerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toPlayerProfile(profile);
  }

  async listEquipment(userId: string): Promise<EquipmentProfile[]> {
    const profile = await this.findProfileOrThrow(userId);
    const equipment = await this.prisma.equipmentProfile.findMany({
      where: { playerProfileId: profile.id },
      orderBy: [{ activeTo: 'asc' }, { activeFrom: 'desc' }],
    });
    return equipment.map(toEquipmentProfile);
  }

  async createEquipment(userId: string, input: CreateEquipmentProfileInput): Promise<EquipmentProfile> {
    const profile = await this.findProfileOrThrow(userId);
    const equipment = await this.prisma.equipmentProfile.create({
      data: toEquipmentProfileCreateData(profile.id, input),
    });
    return toEquipmentProfile(equipment);
  }

  async updateEquipment(
    userId: string,
    id: string,
    input: UpdateEquipmentProfileInput,
  ): Promise<EquipmentProfile> {
    const profile = await this.findProfileOrThrow(userId);
    await this.findEquipmentOrThrow(profile.id, id);
    const equipment = await this.prisma.equipmentProfile.update({
      where: { id },
      data: toEquipmentProfileData(input),
    });
    return toEquipmentProfile(equipment);
  }

  async deleteEquipment(userId: string, id: string): Promise<void> {
    const profile = await this.findProfileOrThrow(userId);
    await this.findEquipmentOrThrow(profile.id, id);
    await this.prisma.equipmentProfile.delete({ where: { id } });
  }

  private async findProfileOrThrow(userId: string): Promise<PrismaPlayerProfile> {
    const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return profile;
  }

  private async findEquipmentOrThrow(
    playerProfileId: string,
    id: string,
  ): Promise<PrismaEquipmentProfile> {
    const equipment = await this.prisma.equipmentProfile.findFirst({
      where: { id, playerProfileId },
    });
    if (!equipment) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return equipment;
  }
}

function toPlayerProfileData(input: UpsertPlayerProfileInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
    country: input.country ?? null,
    dominantHand: input.dominantHand ?? null,
    level: input.level ?? null,
    seasonGoal: input.seasonGoal ?? null,
  };
}

function toEquipmentProfileData(
  input: CreateEquipmentProfileInput | UpdateEquipmentProfileInput,
): Prisma.EquipmentProfileUpdateInput {
  const data: Prisma.EquipmentProfileUpdateInput = {};
  if ('cueName' in input) data.cueName = input.cueName ?? null;
  if ('cueWeight' in input) data.cueWeight = input.cueWeight ?? null;
  if ('tipBrand' in input) data.tipBrand = input.tipBrand ?? null;
  if ('tipSize' in input) data.tipSize = input.tipSize ?? null;
  if ('tipChangeDate' in input) {
    data.tipChangeDate = input.tipChangeDate ? new Date(input.tipChangeDate) : null;
  }
  if ('extension' in input) data.extension = input.extension ?? null;
  if ('chalk' in input) data.chalk = input.chalk ?? null;
  if ('notes' in input) data.notes = input.notes ?? null;
  if ('activeFrom' in input && input.activeFrom) data.activeFrom = new Date(input.activeFrom);
  if ('activeTo' in input) data.activeTo = input.activeTo ? new Date(input.activeTo) : null;
  return data;
}

function toEquipmentProfileCreateData(
  playerProfileId: string,
  input: CreateEquipmentProfileInput,
): Prisma.EquipmentProfileUncheckedCreateInput {
  return {
    playerProfileId,
    cueName: input.cueName ?? null,
    cueWeight: input.cueWeight ?? null,
    tipBrand: input.tipBrand ?? null,
    tipSize: input.tipSize ?? null,
    tipChangeDate: input.tipChangeDate ? new Date(input.tipChangeDate) : null,
    extension: input.extension ?? null,
    chalk: input.chalk ?? null,
    notes: input.notes ?? null,
    ...(input.activeFrom ? { activeFrom: new Date(input.activeFrom) } : {}),
    activeTo: input.activeTo ? new Date(input.activeTo) : null,
  };
}

function toPlayerProfile(profile: PrismaPlayerProfile): PlayerProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth?.toISOString(),
    country: profile.country ?? undefined,
    dominantHand: profile.dominantHand ?? undefined,
    level: profile.level ?? undefined,
    seasonGoal: profile.seasonGoal ?? undefined,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function toEquipmentProfile(profile: PrismaEquipmentProfile): EquipmentProfile {
  return {
    id: profile.id,
    playerProfileId: profile.playerProfileId,
    cueName: profile.cueName ?? undefined,
    cueWeight: profile.cueWeight ?? undefined,
    tipBrand: profile.tipBrand ?? undefined,
    tipSize: profile.tipSize ?? undefined,
    tipChangeDate: profile.tipChangeDate?.toISOString(),
    extension: profile.extension ?? undefined,
    chalk: profile.chalk ?? undefined,
    notes: profile.notes ?? undefined,
    activeFrom: profile.activeFrom.toISOString(),
    activeTo: profile.activeTo?.toISOString(),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
