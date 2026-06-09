import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  DrillCategory as PrismaDrillCategory,
  DrillDifficulty as PrismaDrillDifficulty,
  DrillTemplate as PrismaDrillTemplate,
  DrillVisibility as PrismaDrillVisibility,
  Prisma,
} from '@prisma/client';
import {
  ErrorCodes,
  TableLayoutSchema,
  type CreateDrillTemplateInput,
  type DrillCategory,
  type DrillDifficulty,
  type DrillMetrics,
  type DrillTemplate,
  type DrillVisibility,
  type RecognizeLayoutInput,
  type TableLayout,
  type UpdateDrillTemplateInput,
} from '@snooker/shared';
import { PrismaService } from '../prisma/prisma.module';
import { recognizeTableLayout } from './table-vision';

@Injectable()
export class DrillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Photo → ball map. Synchronously asks Claude Vision to read ball positions
   * off an uploaded table photo and returns a TableLayout the client can drop
   * into the layout editor for manual correction before saving. Requires an
   * Anthropic provider + API key; no local fallback is meaningful for vision.
   */
  async recognizeLayout(input: RecognizeLayoutInput): Promise<TableLayout> {
    const provider = (this.config.get<string>('AI_PROVIDER') ?? 'none').toLowerCase();
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (provider !== 'anthropic' || !apiKey) {
      throw new BadRequestException({ error: { code: ErrorCodes.Drills.AiUnavailable } });
    }
    // Vision/spatial reasoning (resolving tightly packed reds) is much better on
    // a Sonnet-class model than on the fast Haiku used for text summaries, so the
    // recognition model is overridable independently of AI_MODEL.
    const model =
      this.config.get<string>('AI_VISION_MODEL') ??
      this.config.get<string>('AI_MODEL') ??
      'claude-sonnet-4-5';
    try {
      const layout = await recognizeTableLayout({
        apiKey,
        model,
        base64: input.imageBase64,
        mediaType: input.mediaType,
        tableSize: input.tableSize,
      });
      return TableLayoutSchema.parse(layout);
    } catch {
      throw new BadRequestException({ error: { code: ErrorCodes.Drills.RecognitionFailed } });
    }
  }

  async list(userId: string): Promise<DrillTemplate[]> {
    const templates = await this.prisma.drillTemplate.findMany({
      where: visibleToUser(userId),
      include: { favoritedBy: { where: { userId }, select: { userId: true } } },
      orderBy: [{ updatedAt: 'desc' }],
    });
    return templates.map(toDrillTemplate);
  }

  async get(userId: string, id: string): Promise<DrillTemplate> {
    const template = await this.prisma.drillTemplate.findFirst({
      where: { id, ...visibleToUser(userId) },
      include: { favoritedBy: { where: { userId }, select: { userId: true } } },
    });
    if (!template) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return toDrillTemplate(template);
  }

  async toggleFavorite(userId: string, drillTemplateId: string): Promise<void> {
    await this.findVisibleOrThrow(userId, drillTemplateId);
    const existing = await this.prisma.userFavoriteDrill.findUnique({
      where: { userId_drillTemplateId: { userId, drillTemplateId } },
    });
    if (existing) {
      await this.prisma.userFavoriteDrill.delete({
        where: { userId_drillTemplateId: { userId, drillTemplateId } },
      });
    } else {
      await this.prisma.userFavoriteDrill.create({ data: { userId, drillTemplateId } });
    }
  }

  async create(userId: string, input: CreateDrillTemplateInput): Promise<DrillTemplate> {
    const data: Prisma.DrillTemplateUncheckedCreateInput = {
      name: input.name,
      category: toPrismaCategory(input.category),
      difficulty: toPrismaDifficulty(input.difficulty),
      description: input.description,
      goal: input.goal,
      rules: input.rules,
      successCriteria: input.successCriteria,
      metricsSchemaJson: input.metricsSchema as Prisma.InputJsonValue,
      tags: input.tags ?? [],
      visibility: toPrismaVisibility(input.visibility),
      createdByUserId: userId,
    };
    if (input.defaultTableLayout) {
      data.defaultTableLayoutJson = input.defaultTableLayout as Prisma.InputJsonValue;
    }
    const template = await this.prisma.drillTemplate.create({
      data,
    });
    return toDrillTemplate(template);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateDrillTemplateInput,
  ): Promise<DrillTemplate> {
    const existing = await this.findVisibleOrThrow(userId, id);
    assertCanMutate(userId, existing);
    const template = await this.prisma.drillTemplate.update({
      where: { id },
      data: toUpdateData(input),
    });
    return toDrillTemplate(template);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.findVisibleOrThrow(userId, id);
    assertCanMutate(userId, existing);
    await this.prisma.drillTemplate.delete({ where: { id } });
  }

  private async findVisibleOrThrow(userId: string, id: string): Promise<PrismaDrillTemplate> {
    const template = await this.prisma.drillTemplate.findFirst({
      where: { id, ...visibleToUser(userId) },
    });
    if (!template) {
      throw new NotFoundException({ error: { code: ErrorCodes.Generic.NotFound } });
    }
    return template;
  }
}

function visibleToUser(userId: string): Prisma.DrillTemplateWhereInput {
  return {
    OR: [
      { createdByUserId: userId },
      { visibility: 'SYSTEM' },
      { visibility: 'SHARED' },
    ],
  };
}

function assertCanMutate(userId: string, template: PrismaDrillTemplate): void {
  if (template.createdByUserId !== userId || template.visibility === 'SYSTEM') {
    throw new ForbiddenException({ error: { code: ErrorCodes.Auth.Unauthorized } });
  }
}

function toUpdateData(input: UpdateDrillTemplateInput): Prisma.DrillTemplateUpdateInput {
  const data: Prisma.DrillTemplateUpdateInput = {};
  if ('name' in input && input.name !== undefined) data.name = input.name;
  if ('category' in input && input.category) data.category = toPrismaCategory(input.category);
  if ('difficulty' in input && input.difficulty) {
    data.difficulty = toPrismaDifficulty(input.difficulty);
  }
  if ('description' in input && input.description !== undefined) data.description = input.description;
  if ('goal' in input && input.goal !== undefined) data.goal = input.goal;
  if ('rules' in input && input.rules !== undefined) data.rules = input.rules;
  if ('successCriteria' in input && input.successCriteria !== undefined) {
    data.successCriteria = input.successCriteria;
  }
  if ('metricsSchema' in input && input.metricsSchema) {
    data.metricsSchemaJson = input.metricsSchema as Prisma.InputJsonValue;
  }
  if ('defaultTableLayout' in input && input.defaultTableLayout !== undefined) {
    data.defaultTableLayoutJson = input.defaultTableLayout as Prisma.InputJsonValue;
  }
  if ('tags' in input && input.tags) data.tags = input.tags;
  if ('visibility' in input && input.visibility) data.visibility = toPrismaVisibility(input.visibility);
  return data;
}

export function toDrillTemplate(
  template: PrismaDrillTemplate & { favoritedBy?: Array<{ userId: string }> },
): DrillTemplate {
  return {
    id: template.id,
    name: template.name,
    category: fromPrismaCategory(template.category),
    difficulty: fromPrismaDifficulty(template.difficulty),
    description: template.description,
    goal: template.goal,
    rules: template.rules,
    successCriteria: template.successCriteria,
    metricsSchema: template.metricsSchemaJson as DrillMetrics,
    defaultTableLayout: template.defaultTableLayoutJson
      ? (template.defaultTableLayoutJson as TableLayout)
      : undefined,
    tags: template.tags,
    visibility: fromPrismaVisibility(template.visibility),
    createdByUserId: template.createdByUserId,
    isFavorited: (template.favoritedBy?.length ?? 0) > 0,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function toPrismaCategory(category: DrillCategory): PrismaDrillCategory {
  return categoryMap[category];
}

function fromPrismaCategory(category: PrismaDrillCategory): DrillCategory {
  return reverseCategoryMap[category];
}

function toPrismaDifficulty(difficulty: DrillDifficulty): PrismaDrillDifficulty {
  return difficultyMap[difficulty];
}

function fromPrismaDifficulty(difficulty: PrismaDrillDifficulty): DrillDifficulty {
  return reverseDifficultyMap[difficulty];
}

export function toPrismaVisibility(visibility: DrillVisibility): PrismaDrillVisibility {
  return visibilityMap[visibility];
}

function fromPrismaVisibility(visibility: PrismaDrillVisibility): DrillVisibility {
  return reverseVisibilityMap[visibility];
}

const categoryMap: Record<DrillCategory, PrismaDrillCategory> = {
  cue_action: 'CUE_ACTION',
  potting: 'POTTING',
  positional_play: 'POSITIONAL_PLAY',
  break_building: 'BREAK_BUILDING',
  safety: 'SAFETY',
  snooker_escape: 'SNOOKER_ESCAPE',
  tactical_play: 'TACTICAL_PLAY',
  match_simulation: 'MATCH_SIMULATION',
  pressure_training: 'PRESSURE_TRAINING',
  mental_routine: 'MENTAL_ROUTINE',
  custom: 'CUSTOM',
};

const reverseCategoryMap = Object.fromEntries(
  Object.entries(categoryMap).map(([key, value]) => [value, key]),
) as Record<PrismaDrillCategory, DrillCategory>;

const difficultyMap: Record<DrillDifficulty, PrismaDrillDifficulty> = {
  beginner: 'BEGINNER',
  intermediate: 'INTERMEDIATE',
  advanced: 'ADVANCED',
  professional: 'PROFESSIONAL',
};

const reverseDifficultyMap = Object.fromEntries(
  Object.entries(difficultyMap).map(([key, value]) => [value, key]),
) as Record<PrismaDrillDifficulty, DrillDifficulty>;

const visibilityMap: Record<DrillVisibility, PrismaDrillVisibility> = {
  private: 'PRIVATE',
  shared: 'SHARED',
  system: 'SYSTEM',
};

const reverseVisibilityMap = Object.fromEntries(
  Object.entries(visibilityMap).map(([key, value]) => [value, key]),
) as Record<PrismaDrillVisibility, DrillVisibility>;
