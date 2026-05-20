import { z } from 'zod';

export const AiReportTypeSchema = z.enum(['weekly_summary']);
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
});
export type AiReportDataSources = z.infer<typeof AiReportDataSourcesSchema>;

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
  .transform((value) => (value === '' ? undefined : value));

export const GenerateWeeklyAiReportSchema = z.object({
  periodStart: OptionalDateStringSchema,
  periodEnd: OptionalDateStringSchema,
  locale: z.enum(['ru', 'en', 'uk']).default('ru'),
});
export type GenerateWeeklyAiReportInput = z.infer<typeof GenerateWeeklyAiReportSchema>;