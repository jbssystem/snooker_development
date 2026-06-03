import { z } from 'zod';

export const MatchResultSchema = z.enum(['player_win', 'opponent_win', 'draw', 'unknown']);
export type MatchResult = z.infer<typeof MatchResultSchema>;

export const MatchSourceSchema = z.enum(['manual', 'external']);
export type MatchSource = z.infer<typeof MatchSourceSchema>;

export const FrameWinnerSchema = z.enum(['player', 'opponent', 'unknown']);
export type FrameWinner = z.infer<typeof FrameWinnerSchema>;

// A coaching record is either a competitive match or a sparring session. Both
// share the same entity and statistics; the type only changes labels and tags.
export const MatchTypeSchema = z.enum(['match', 'sparring']);
export type MatchType = z.infer<typeof MatchTypeSchema>;

// Replayable ball-by-ball log produced by the detailed live scorer. Mirrors the
// `ScoreEvent` union in @snooker/snooker-domain; kept in sync deliberately so
// shared stays framework- and domain-agnostic.
const ScoringBallSchema = z.enum(['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black']);
const FrameSideSchema = z.enum(['player', 'opponent']);

export const ScoreEventSchema = z.discriminatedUnion('type', [
  z.object({
    seq: z.number().int().positive(),
    type: z.literal('pot'),
    player: FrameSideSchema,
    ball: ScoringBallSchema,
    points: z.number().int().min(0),
    freeBall: z.boolean().optional(),
  }),
  z.object({
    seq: z.number().int().positive(),
    type: z.literal('foul'),
    player: FrameSideSchema,
    value: z.number().int().min(0),
  }),
  z.object({
    seq: z.number().int().positive(),
    type: z.literal('endTurn'),
    player: FrameSideSchema,
    kind: z.enum(['safety', 'miss', 'switch']),
  }),
]);
export type ScoreEvent = z.infer<typeof ScoreEventSchema>;

const ScoreEventsSchema = z.array(ScoreEventSchema).max(1000).optional();

const OptionalTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const OptionalHttpUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine((value) => value === undefined || isHttpUrl(value));

const OptionalDateStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .refine((value) => value === undefined || isValidDateInput(value));

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
  scoreEvents: z.array(ScoreEventSchema).optional(),
  createdAt: z.string().datetime(),
});
export type MatchFrame = z.infer<typeof MatchFrameSchema>;

export const MatchSchema = z.object({
  id: z.string().cuid(),
  playerProfileId: z.string().cuid(),
  createdByUserId: z.string().cuid(),
  matchDate: z.string().datetime(),
  matchType: MatchTypeSchema,
  isLive: z.boolean(),
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
  matchType: MatchTypeSchema.default('match'),
  isLive: z.boolean().optional().default(false),
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
  sourceUrl: OptionalHttpUrlSchema,
  videoUrl: OptionalHttpUrlSchema,
  notes: OptionalTextSchema,
});
export type CreateMatchInput = z.infer<typeof CreateMatchSchema>;

export const UpdateMatchSchema = z.object({
  matchDate: OptionalDateStringSchema,
  matchType: MatchTypeSchema.optional(),
  isLive: z.boolean().optional(),
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
  sourceUrl: OptionalHttpUrlSchema,
  videoUrl: OptionalHttpUrlSchema,
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
  scoreEvents: ScoreEventsSchema,
});
export type AddMatchFrameInput = z.infer<typeof AddMatchFrameSchema>;

// Frame edit: scores/break/duration/notes. The winner is re-derived from the
// scores server-side, and the frame number is fixed by the route.
export const UpdateMatchFrameSchema = z.object({
  playerScore: OptionalBoundedIntSchema(0, 999),
  opponentScore: OptionalBoundedIntSchema(0, 999),
  highBreak: OptionalBoundedIntSchema(0, 155),
  frameDurationSec: OptionalBoundedIntSchema(1, 24 * 60 * 60),
  notes: OptionalTextSchema,
  scoreEvents: ScoreEventsSchema,
});
export type UpdateMatchFrameInput = z.infer<typeof UpdateMatchFrameSchema>;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDateInput(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}
