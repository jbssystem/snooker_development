import { z } from 'zod';

export const CalendarEventTypeSchema = z.enum([
  'training',
  'tournament',
  'match',
  'travel',
  'rest_day',
  'illness',
  'injury',
  'equipment_change',
  'coach_change',
  'supplement_start',
  'supplement_end',
  'sleep_issue',
  'school_workload',
  'custom_factor',
]);
export type CalendarEventType = z.infer<typeof CalendarEventTypeSchema>;

export const CalendarEventSourceSchema = z.enum(['manual', 'external']);
export type CalendarEventSource = z.infer<typeof CalendarEventSourceSchema>;

const OptionalTextSchema = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const DateInputSchema = z.string().trim().min(1).refine(isValidDateInput);
const OptionalDateInputSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine((value) => value === undefined || isValidDateInput(value));

const OptionalScoreSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().int().min(1).max(10).optional(),
);

const OptionalHoursSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().min(0).max(24).optional(),
);

const MetadataSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => jsonSize(value) <= 4096)
  .optional();

export const CalendarEventSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  createdByUserId: z.string().cuid(),
  eventType: CalendarEventTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  source: CalendarEventSourceSchema,
  metadata: MetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CreateCalendarEventSchema = z.object({
  eventType: CalendarEventTypeSchema,
  title: z.string().trim().min(1).max(180),
  description: OptionalTextSchema(),
  startAt: DateInputSchema,
  endAt: OptionalDateInputSchema,
  metadata: MetadataSchema,
});
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventSchema>;

export const UpdateCalendarEventSchema = CreateCalendarEventSchema.partial();
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventSchema>;

export const LifestyleFactorSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  date: z.string().datetime(),
  sleepHours: z.number().optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  fatigue: z.number().int().min(1).max(10).optional(),
  stress: z.number().int().min(1).max(10).optional(),
  focus: z.number().int().min(1).max(10).optional(),
  mood: z.string().optional(),
  illness: z.boolean(),
  injury: z.boolean(),
  travel: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LifestyleFactor = z.infer<typeof LifestyleFactorSchema>;

export const CreateLifestyleFactorSchema = z.object({
  date: DateInputSchema,
  sleepHours: OptionalHoursSchema,
  sleepQuality: OptionalScoreSchema,
  fatigue: OptionalScoreSchema,
  stress: OptionalScoreSchema,
  focus: OptionalScoreSchema,
  mood: OptionalTextSchema(120),
  illness: z.boolean().optional(),
  injury: z.boolean().optional(),
  travel: z.boolean().optional(),
  notes: OptionalTextSchema(),
});
export type CreateLifestyleFactorInput = z.infer<typeof CreateLifestyleFactorSchema>;

export const UpdateLifestyleFactorSchema = CreateLifestyleFactorSchema.partial();
export type UpdateLifestyleFactorInput = z.infer<typeof UpdateLifestyleFactorSchema>;

export const SupplementEventSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  createdByUserId: z.string().cuid(),
  name: z.string(),
  category: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  dosageNote: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SupplementEvent = z.infer<typeof SupplementEventSchema>;

export const CreateSupplementEventSchema = z.object({
  name: z.string().trim().min(1).max(180),
  category: OptionalTextSchema(120),
  startDate: DateInputSchema,
  endDate: OptionalDateInputSchema,
  dosageNote: OptionalTextSchema(240),
  reason: OptionalTextSchema(240),
  notes: OptionalTextSchema(),
});
export type CreateSupplementEventInput = z.infer<typeof CreateSupplementEventSchema>;

export const UpdateSupplementEventSchema = CreateSupplementEventSchema.partial();
export type UpdateSupplementEventInput = z.infer<typeof UpdateSupplementEventSchema>;

function jsonSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isValidDateInput(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
