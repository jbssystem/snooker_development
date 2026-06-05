import { z } from 'zod';

export const AiReportTypeSchema = z.enum(['weekly_summary', 'external_analysis']);
export type AiReportType = z.infer<typeof AiReportTypeSchema>;

export const AiReportStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type AiReportStatus = z.infer<typeof AiReportStatusSchema>;

export const AiProviderSchema = z.enum(['anthropic', 'openai', 'local', 'none']);
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiReportDataSourcesSchema = z.object({
  trainingSessions: z.number().int().min(0),
  drillExecutions: z.number().int().min(0),
  matches: z.number().int().min(0),
  calendarEvents: z.number().int().min(0),
  lifestyleFactors: z.number().int().min(0),
  supplementEvents: z.number().int().min(0),
  previousReports: z.number().int().min(0),
  externalImports: z.number().int().min(0),
});
export type AiReportDataSources = z.infer<typeof AiReportDataSourcesSchema>;

/** Localized labels for a focus preset (admin-editable). */
export const AiFocusPresetLabelSchema = z.object({
  ru: z.string().trim().min(1).max(80),
  en: z.string().trim().min(1).max(80),
  uk: z.string().trim().min(1).max(80),
});
export type AiFocusPresetLabel = z.infer<typeof AiFocusPresetLabelSchema>;

/** Full focus-preset record for the admin console. */
export const AiFocusPresetSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  label: AiFocusPresetLabelSchema,
  promptInstruction: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdByUserId: z.string().cuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AiFocusPreset = z.infer<typeof AiFocusPresetSchema>;

/** Lightweight focus preset returned to players for the generation form. */
export const ActiveAiFocusPresetSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  label: z.string(),
});
export type ActiveAiFocusPreset = z.infer<typeof ActiveAiFocusPresetSchema>;

export const CreateAiFocusPresetSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits and dashes'),
  label: AiFocusPresetLabelSchema,
  promptInstruction: z.string().trim().min(1).max(2000),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
});
export type CreateAiFocusPresetInput = z.infer<typeof CreateAiFocusPresetSchema>;

export const UpdateAiFocusPresetSchema = CreateAiFocusPresetSchema.partial();
export type UpdateAiFocusPresetInput = z.infer<typeof UpdateAiFocusPresetSchema>;

/** Focus areas attached to a generated report (for display). */
export const AiReportFocusAreaSchema = z.object({
  slug: z.string(),
  label: z.string(),
});
export type AiReportFocusArea = z.infer<typeof AiReportFocusAreaSchema>;

export const AiReportSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  requestedByUserId: z.string().cuid(),
  reportType: AiReportTypeSchema,
  status: AiReportStatusSchema,
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  locale: z.enum(['ru', 'en', 'uk']),
  title: z.string().optional(),
  contentMarkdown: z.string().optional(),
  sourceDataHash: z.string(),
  sourceData: z.unknown().optional(),
  focusAreas: z.array(AiReportFocusAreaSchema).optional(),
  dataSources: AiReportDataSourcesSchema,
  promptVersion: z.string(),
  provider: AiProviderSchema,
  model: z.string(),
  errorMessage: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AiReport = z.infer<typeof AiReportSchema>;

const OptionalDateStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine((value) => value === undefined || !Number.isNaN(new Date(value).getTime()));

const FocusPresetIdsSchema = z.array(z.string().cuid()).max(8).optional();

export const GenerateWeeklyAiReportSchema = z.object({
  periodStart: OptionalDateStringSchema,
  periodEnd: OptionalDateStringSchema,
  locale: z.enum(['ru', 'en', 'uk']).default('ru'),
  focusPresetIds: FocusPresetIdsSchema,
});
export type GenerateWeeklyAiReportInput = z.infer<typeof GenerateWeeklyAiReportSchema>;

export const GenerateExternalMatchReportSchema = z.object({
  matchIds: z.array(z.string().cuid()).min(1).max(50),
  locale: z.enum(['ru', 'en', 'uk']).default('ru'),
  focusPresetIds: FocusPresetIdsSchema,
});
export type GenerateExternalMatchReportInput = z.infer<typeof GenerateExternalMatchReportSchema>;