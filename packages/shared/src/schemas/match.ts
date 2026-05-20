import { z } from 'zod';

export const MatchResultSchema = z.enum(['player_win', 'opponent_win', 'draw', 'unknown']);
export type MatchResult = z.infer<typeof MatchResultSchema>;

export const MatchSourceSchema = z.enum(['manual', 'external']);
export type MatchSource = z.infer<typeof MatchSourceSchema>;

export const FrameWinnerSchema = z.enum(['player', 'opponent', 'unknown']);
export type FrameWinner = z.infer<typeof FrameWinnerSchema>;

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
  .transform((value) => (value === '' ? undefined : value));

const OptionalBoundedIntSchema = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.coerce.number().int().min(min).max(max).optional(),
  );

const OptionalPercentageSchema = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.coerce.number().min(0).max(100).optional(),
);

export const MatchFrameSchema = z.object({
  id: z.string().cuid(),
  matchId: z.string().cuid(),
  frameNumber: z.number().int().positive(),
  playerScore: z.number().int().min(0).optional(),
  opponentScore: z.number().int().min(0).optional(),
  winner: FrameWinnerSchema,
  highBreak: z.number().int().min(0).optional(),
  frameDurationSec: z.number().int().positive().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type MatchFrame = z.infer<typeof MatchFrameSchema>;

export const MatchSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  createdByUserId: z.string().cuid(),
  matchDate: z.string().datetime(),
  tournament: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  club: z.string().optional(),
  opponentName: z.string(),
  opponentExternalId: z.string().optional(),
  round: z.string().optional(),
  format: z.string().optional(),
  framesWon: z.number().int().min(0),
  framesLost: z.number().int().min(0),
  highBreak: z.number().int().min(0).optional(),
  breaks50: z.number().int().min(0),
  breaks70: z.number().int().min(0),
  breaks100: z.number().int().min(0),
  decidingFrameResult: FrameWinnerSchema.optional(),
  safetySuccess: z.number().min(0).max(100).optional(),
  longPotSuccess: z.number().min(0).max(100).optional(),
  unforcedErrors: z.number().int().min(0).optional(),
  tacticalErrors: z.number().int().min(0).optional(),
  result: MatchResultSchema,
  source: MatchSourceSchema,
  sourceUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  notes: z.string().optional(),
  frames: z.array(MatchFrameSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Match = z.infer<typeof MatchSchema>;

export const CreateMatchSchema = z.object({
  matchDate: OptionalDateStringSchema,
  tournament: OptionalTextSchema,
  country: OptionalTextSchema,
  city: OptionalTextSchema,
  club: OptionalTextSchema,
  opponentName: z.string().trim().min(1).max(160),
  opponentExternalId: OptionalTextSchema,
  round: OptionalTextSchema,
  format: OptionalTextSchema,
  framesWon: OptionalBoundedIntSchema(0, 99),
  framesLost: OptionalBoundedIntSchema(0, 99),
  highBreak: OptionalBoundedIntSchema(0, 155),
  breaks50: OptionalBoundedIntSchema(0, 99),
  breaks70: OptionalBoundedIntSchema(0, 99),
  breaks100: OptionalBoundedIntSchema(0, 99),
  decidingFrameResult: FrameWinnerSchema.optional(),
  safetySuccess: OptionalPercentageSchema,
  longPotSuccess: OptionalPercentageSchema,
  unforcedErrors: OptionalBoundedIntSchema(0, 999),
  tacticalErrors: OptionalBoundedIntSchema(0, 999),
  result: MatchResultSchema.optional(),
  sourceUrl: OptionalTextSchema,
  videoUrl: OptionalTextSchema,
  notes: OptionalTextSchema,
});
export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;

export const UpdateMatchSchema = z.object({
  matchDate: OptionalDateStringSchema,
  tournament: OptionalTextSchema,
  country: OptionalTextSchema,
  city: OptionalTextSchema,
  club: OptionalTextSchema,
  opponentName: OptionalTextSchema,
  opponentExternalId: OptionalTextSchema,
  round: OptionalTextSchema,
  format: OptionalTextSchema,
  framesWon: OptionalBoundedIntSchema(0, 99),
  framesLost: OptionalBoundedIntSchema(0, 99),
  highBreak: OptionalBoundedIntSchema(0, 155),
  breaks50: OptionalBoundedIntSchema(0, 99),
  breaks70: OptionalBoundedIntSchema(0, 99),
  breaks100: OptionalBoundedIntSchema(0, 99),
  decidingFrameResult: FrameWinnerSchema.optional(),
  safetySuccess: OptionalPercentageSchema,
  longPotSuccess: OptionalPercentageSchema,
  unforcedErrors: OptionalBoundedIntSchema(0, 999),
  tacticalErrors: OptionalBoundedIntSchema(0, 999),
  result: MatchResultSchema.optional(),
  sourceUrl: OptionalTextSchema,
  videoUrl: OptionalTextSchema,
  notes: OptionalTextSchema,
});
export type UpdateMatchInput = z.infer<typeof UpdateMatchSchema>;

export const AddMatchFrameSchema = z.object({
  frameNumber: OptionalBoundedIntSchema(1, 99),
  playerScore: OptionalBoundedIntSchema(0, 999),
  opponentScore: OptionalBoundedIntSchema(0, 999),
  winner: FrameWinnerSchema.default('unknown'),
  highBreak: OptionalBoundedIntSchema(0, 155),
  frameDurationSec: OptionalBoundedIntSchema(1, 24 * 60 * 60),
  notes: OptionalTextSchema,
});
export type AddMatchFrameInput = z.infer<typeof AddMatchFrameSchema>;
