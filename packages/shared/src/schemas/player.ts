import { z } from 'zod';

export const PlayerProfileSchema = z.object({
  id: z.string().cuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.coerce.date().optional(),
  country: z.string().length(2).optional(),
  dominantHand: z.enum(['LEFT', 'RIGHT', 'AMBIDEXTROUS']).optional(),
  level: z.string().optional(),
  seasonGoal: z.string().optional(),
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const CreatePlayerProfileSchema = PlayerProfileSchema.omit({ id: true });
export type CreatePlayerProfileInput = z.infer<typeof CreatePlayerProfileSchema>;
