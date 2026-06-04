import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import type { ProfileContext } from '../profiles/profile-context';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(ctx: ProfileContext | null): Promise<PlayerProfile | null> {
    if (!ctx) return null;
    const profile = await this.prisma.playerProfile.findUnique({ where: { id: ctx.profileId } });
    return profile ? toPlayerProfile(profile) : null;
  }

  /**
   * Creates the acting user's own profile (bootstrap), or edits the active
   * cabinet's profile when an editor is acting in a shared cabinet.
   */
  async upsertProfile(
    userId: string,
    ctx: ProfileContext | null,
    input: UpsertPlayerProfileInput,
  ): Promise<PlayerProfile> {
    const data = toPlayerProfileData(input);
    if (ctx && !ctx.isOwner) {
      if (ctx.accessLevel !== 'EDIT') {
        throw new ForbiddenException({ error: { code: ErrorCodes.Sharing.WriteAccessDenied } });
      }
      const profile = await this.prisma.playerProfile.update({
        where: { id: ctx.profileId },
        data,
      });
      return toPlayerProfile(profile);
    }
    const profile = await this.prisma.playerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toPlayerProfile(profile);
  }

  async updateAvatar(profileId: string, avatar: string): Promise<PlayerProfile> {
    const profile = await this.prisma.playerProfile.update({
      where: { id: profileId },
      data: { avatar },
    });
    return toPlayerProfile(profile);
  }

  async listEquipment(profileId: string): Promise<EquipmentProfile[]> {
    const equipment = await this.prisma.equipmentProfile.findMany({
      where: { playerProfileId: profileId },
      orderBy: [{ activeTo: 'asc' }, { activeFrom: 'desc' }],
    });
    return equipment.map(toEquipmentProfile);
  }

  async createEquipment(profileId: string, input: CreateEquipmentProfileInput): Promise<EquipmentProfile> {
    const equipment = await this.prisma.equipmentProfile.create({
      data: toEquipmentProfileCreateData(profileId, input),
    });
    return toEquipmentProfile(equipment);
  }

  async updateEquipment(
    profileId: string,
    id: string,
    input: UpdateEquipmentProfileInput,
  ): Promise<EquipmentProfile> {
    await this.findEquipmentOrThrow(profileId, id);
    const equipment = await this.prisma.equipmentProfile.update({
      where: { id },
      data: toEquipmentProfileData(input),
    });
    return toEquipmentProfile(equipment);
  }

  async deleteEquipment(profileId: string, id: string): Promise<void> {
    await this.findEquipmentOrThrow(profileId, id);
    await this.prisma.equipmentProfile.delete({ where: { id } });
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
    avatar: input.avatar ?? null,
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
    avatar: profile.avatar ?? undefined,
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
