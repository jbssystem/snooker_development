import { z } from 'zod';

export const DominantHandSchema = z.enum(['LEFT', 'RIGHT', 'AMBIDEXTROUS']);

const OptionalTextSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const OptionalDateStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine((value) => value === undefined || isValidDateInput(value));

const OptionalNumberSchema = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.coerce.number().positive().max(max).optional(),
  );

export const PlayerProfileSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().datetime().optional(),
  country: z.string().length(2).optional(),
  dominantHand: DominantHandSchema.optional(),
  level: z.string().optional(),
  seasonGoal: z.string().optional(),
  avatar: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

// Avatar is either a preset id ("preset:<id>") or a cropped image data URL.
// Capped to keep the stored data URL small (client crops to a 256px square).
const AvatarSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z
    .string()
    .max(300000)
    .refine((value) => value.startsWith('preset:') || value.startsWith('data:image/'), {
      message: 'invalid avatar',
    })
    .optional(),
);

export const UpsertPlayerProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dateOfBirth: OptionalDateStringSchema,
  country: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().toUpperCase().length(2).optional(),
  ),
  dominantHand: DominantHandSchema.optional(),
  level: OptionalTextSchema,
  seasonGoal: OptionalTextSchema,
  avatar: AvatarSchema,
});

export const UpdateAvatarSchema = z.object({
  avatar: z
    .string()
    .max(300000)
    .refine((value) => value.startsWith('preset:') || value.startsWith('data:image/'), {
      message: 'invalid avatar',
    }),
});
export type UpdateAvatarInput = z.infer<typeof UpdateAvatarSchema>;

export const CreatePlayerProfileSchema = UpsertPlayerProfileSchema;
export type CreatePlayerProfileInput = z.infer<typeof CreatePlayerProfileSchema>;
export type UpsertPlayerProfileInput = z.infer<typeof UpsertPlayerProfileSchema>;

export const EquipmentProfileSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  cueName: z.string().optional(),
  cueWeight: z.number().optional(),
  tipBrand: z.string().optional(),
  tipSize: z.number().optional(),
  tipChangeDate: z.string().datetime().optional(),
  extension: z.string().optional(),
  chalk: z.string().optional(),
  notes: z.string().optional(),
  activeFrom: z.string().datetime(),
  activeTo: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EquipmentProfile = z.infer<typeof EquipmentProfileSchema>;

export const CreateEquipmentProfileSchema = z.object({
  cueName: OptionalTextSchema,
  cueWeight: OptionalNumberSchema(1000),
  tipBrand: OptionalTextSchema,
  tipSize: OptionalNumberSchema(30),
  tipChangeDate: OptionalDateStringSchema,
  extension: OptionalTextSchema,
  chalk: OptionalTextSchema,
  notes: OptionalTextSchema,
  activeFrom: OptionalDateStringSchema,
  activeTo: OptionalDateStringSchema,
});
export type CreateEquipmentProfileInput = z.infer<typeof CreateEquipmentProfileSchema>;

export const UpdateEquipmentProfileSchema = CreateEquipmentProfileSchema.partial();
export type UpdateEquipmentProfileInput = z.infer<typeof UpdateEquipmentProfileSchema>;

function isValidDateInput(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
