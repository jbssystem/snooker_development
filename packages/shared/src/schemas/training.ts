import { z } from 'zod';
import { TableLayoutSchema } from './drill';

export const TrainingSessionTypeSchema = z.enum(['solo', 'coached', 'match_prep', 'review', 'other']);
export type TrainingSessionType = z.infer<typeof TrainingSessionTypeSchema>;

export const DrillAttemptResultSchema = z.enum(['success', 'partial', 'miss', 'skipped']);
export type DrillAttemptResult = z.infer<typeof DrillAttemptResultSchema>;

const OptionalTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const OptionalDateStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine((value) => value === undefined || isValidDateInput(value));

const OptionalScoreSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().min(0).optional(),
);

const OptionalBoundedIntSchema = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.coerce.number().int().min(min).max(max).optional(),
  );

const TagsSchema = z.array(z.string().trim().min(1).max(40)).max(20).default([]);

export const DrillAttemptSchema = z.object({
  id: z.string().cuid(),
  drillExecutionId: z.string().cuid(),
  attemptNumber: z.number().int().positive(),
  result: DrillAttemptResultSchema,
  score: z.number().optional(),
  potSuccess: z.boolean().optional(),
  positionSuccess: z.boolean().optional(),
  missType: z.string().optional(),
  errorTags: TagsSchema,
  shotTimeMs: z.number().int().positive().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type DrillAttempt = z.infer<typeof DrillAttemptSchema>;

export const DrillExecutionSchema = z.object({
  id: z.string().cuid(),
  trainingSessionId: z.string().cuid(),
  drillTemplateId: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  drillTemplateName: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  score: z.number().optional(),
  maxRun: z.number().int().optional(),
  averageScore: z.number().optional(),
  result: z.unknown().optional(),
  errorTags: TagsSchema,
  coachNotes: z.string().optional(),
  playerNotes: z.string().optional(),
  tableLayoutSnapshot: TableLayoutSchema.optional(),
  attemptsLog: z.array(DrillAttemptSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DrillExecution = z.infer<typeof DrillExecutionSchema>;

export const TrainingSessionSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  createdByUserId: z.string().cuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  sessionType: TrainingSessionTypeSchema,
  title: z.string(),
  goal: z.string().optional(),
  intensity: z.number().int().min(1).max(10).optional(),
  fatigueBefore: z.number().int().min(1).max(10).optional(),
  fatigueAfter: z.number().int().min(1).max(10).optional(),
  focusLevel: z.number().int().min(1).max(10).optional(),
  mood: z.string().optional(),
  notes: z.string().optional(),
  drillExecutions: z.array(DrillExecutionSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

export const CreateTrainingSessionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  sessionType: TrainingSessionTypeSchema.default('solo'),
  startedAt: OptionalDateStringSchema,
  goal: OptionalTextSchema,
  intensity: OptionalBoundedIntSchema(1, 10),
  fatigueBefore: OptionalBoundedIntSchema(1, 10),
  focusLevel: OptionalBoundedIntSchema(1, 10),
  mood: OptionalTextSchema,
  notes: OptionalTextSchema,
});
export type CreateTrainingSessionInput = z.infer<typeof CreateTrainingSessionSchema>;

export const UpdateTrainingSessionSchema = z.object({
  title: OptionalTextSchema,
  sessionType: TrainingSessionTypeSchema.optional(),
  goal: OptionalTextSchema,
  intensity: OptionalBoundedIntSchema(1, 10),
  fatigueBefore: OptionalBoundedIntSchema(1, 10),
  fatigueAfter: OptionalBoundedIntSchema(1, 10),
  focusLevel: OptionalBoundedIntSchema(1, 10),
  mood: OptionalTextSchema,
  notes: OptionalTextSchema,
  endedAt: OptionalDateStringSchema,
});
export type UpdateTrainingSessionInput = z.infer<typeof UpdateTrainingSessionSchema>;

export const AddDrillExecutionSchema = z.object({
  drillTemplateId: z.string().cuid(),
  tableLayoutSnapshot: TableLayoutSchema.optional(),
});
export type AddDrillExecutionInput = z.infer<typeof AddDrillExecutionSchema>;

export const CreateDrillAttemptSchema = z.object({
  result: DrillAttemptResultSchema,
  score: OptionalScoreSchema,
  potSuccess: z.boolean().optional(),
  positionSuccess: z.boolean().optional(),
  missType: OptionalTextSchema,
  errorTags: TagsSchema.optional(),
  shotTimeMs: OptionalBoundedIntSchema(1, 600000),
  notes: OptionalTextSchema,
});
export type CreateDrillAttemptInput = z.infer<typeof CreateDrillAttemptSchema>;

export const FinishDrillExecutionSchema = z.object({
  score: OptionalScoreSchema,
  maxRun: OptionalBoundedIntSchema(0, 10000),
  averageScore: OptionalScoreSchema,
  result: z.unknown().optional(),
  errorTags: TagsSchema.optional(),
  coachNotes: OptionalTextSchema,
  playerNotes: OptionalTextSchema,
});
export type FinishDrillExecutionInput = z.infer<typeof FinishDrillExecutionSchema>;

export const FinishTrainingSessionSchema = z.object({
  fatigueAfter: OptionalBoundedIntSchema(1, 10),
  notes: OptionalTextSchema,
});
export type FinishTrainingSessionInput = z.infer<typeof FinishTrainingSessionSchema>;

function isValidDateInput(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
