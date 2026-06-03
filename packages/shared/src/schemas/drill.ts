import { z } from 'zod';

export const DrillCategorySchema = z.enum([
  'cue_action',
  'potting',
  'positional_play',
  'break_building',
  'safety',
  'snooker_escape',
  'tactical_play',
  'match_simulation',
  'pressure_training',
  'mental_routine',
  'custom',
]);
export type DrillCategory = z.infer<typeof DrillCategorySchema>;

export const DrillDifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'professional',
]);
export type DrillDifficulty = z.infer<typeof DrillDifficultySchema>;

export const DrillVisibilitySchema = z.enum(['private', 'shared', 'system']);
export type DrillVisibility = z.infer<typeof DrillVisibilitySchema>;

export const UserDrillVisibilitySchema = z.enum(['private', 'shared']);
export type UserDrillVisibility = z.infer<typeof UserDrillVisibilitySchema>;

export const DrillMetricTypeSchema = z.enum([
  'number',
  'boolean',
  'percentage',
  'time_ms',
  'text',
]);
export type DrillMetricType = z.infer<typeof DrillMetricTypeSchema>;

export const DrillMetricSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(60),
  label: z.string().trim().min(1).max(120),
  type: DrillMetricTypeSchema,
  unit: z.string().trim().max(40).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean().default(false),
});
export type DrillMetric = z.infer<typeof DrillMetricSchema>;

export const DrillMetricsSchema = z.object({
  version: z.literal(1),
  metrics: z.array(DrillMetricSchema).max(20),
});
export type DrillMetrics = z.infer<typeof DrillMetricsSchema>;

const PointSchema = z.object({ x: z.number(), y: z.number() });
const BallPositionSchema = z.object({
  id: z.string().trim().min(1),
  color: z.enum(['white', 'red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black']),
  x: z.number(),
  y: z.number(),
  visible: z.boolean(),
});
const TargetZoneSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().trim().min(1),
    type: z.literal('circle'),
    x: z.number(),
    y: z.number(),
    radius: z.number().positive(),
    label: z.string().optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal('rectangle'),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    label: z.string().optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal('polygon'),
    points: z.array(PointSchema).min(3).max(16),
    label: z.string().optional(),
  }),
]);
const ShotPathSchema = z.object({
  id: z.string().trim().min(1),
  from: PointSchema,
  to: PointSchema,
  cushions: z.array(PointSchema).optional(),
  label: z.string().optional(),
});
const TableAnnotationSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  at: PointSchema,
});

export const TableLayoutSchema = z.object({
  id: z.string().trim().min(1),
  tableSize: z.enum(['full-size', 'club', 'custom']),
  balls: z.array(BallPositionSchema).max(32),
  targetZones: z.array(TargetZoneSchema).max(24),
  shotPaths: z.array(ShotPathSchema).max(24),
  annotations: z.array(TableAnnotationSchema).max(24),
});
export type TableLayout = z.infer<typeof TableLayoutSchema>;

// Photo → ball-map: the client sends a base64-encoded photo of a real table and
// the server returns a TableLayout recognised by Claude Vision. The cap (~9.5M
// chars ≈ 7 MB binary) keeps the synchronous request from ballooning; the client
// should downscale before sending.
export const RecognizeLayoutInputSchema = z.object({
  imageBase64: z.string().min(1).max(12_000_000),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  tableSize: z.enum(['full-size', 'club', 'custom']).default('full-size'),
});
export type RecognizeLayoutInput = z.infer<typeof RecognizeLayoutInputSchema>;

const OptionalTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const TagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(12)
  .default([]);

export const DrillTemplateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1).max(160),
  category: DrillCategorySchema,
  difficulty: DrillDifficultySchema,
  description: z.string().trim().min(1).max(2000),
  goal: z.string().trim().min(1).max(1000),
  rules: z.string().trim().min(1).max(2000),
  successCriteria: z.string().trim().min(1).max(1000),
  metricsSchema: DrillMetricsSchema,
  defaultTableLayout: TableLayoutSchema.optional(),
  tags: TagsSchema,
  visibility: DrillVisibilitySchema,
  createdByUserId: z.string().cuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DrillTemplate = z.infer<typeof DrillTemplateSchema>;

export const CreateDrillTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: DrillCategorySchema,
  difficulty: DrillDifficultySchema,
  description: z.string().trim().min(1).max(2000),
  goal: z.string().trim().min(1).max(1000),
  rules: z.string().trim().min(1).max(2000),
  successCriteria: z.string().trim().min(1).max(1000),
  metricsSchema: DrillMetricsSchema,
  defaultTableLayout: TableLayoutSchema.optional(),
  tags: TagsSchema.optional(),
  visibility: UserDrillVisibilitySchema.default('private'),
});
export type CreateDrillTemplateInput = z.infer<typeof CreateDrillTemplateSchema>;

export const UpdateDrillTemplateSchema = z.object({
  name: OptionalTextSchema,
  category: DrillCategorySchema.optional(),
  difficulty: DrillDifficultySchema.optional(),
  description: OptionalTextSchema,
  goal: OptionalTextSchema,
  rules: OptionalTextSchema,
  successCriteria: OptionalTextSchema,
  metricsSchema: DrillMetricsSchema.optional(),
  defaultTableLayout: TableLayoutSchema.optional(),
  tags: TagsSchema.optional(),
  visibility: UserDrillVisibilitySchema.optional(),
});
export type UpdateDrillTemplateInput = z.infer<typeof UpdateDrillTemplateSchema>;
