import { z } from 'zod';

export const ExternalSourceSchema = z.enum(['wst', 'cuetracker']);
export type ExternalSourceType = z.infer<typeof ExternalSourceSchema>;

export const ImportJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type ImportJobStatusType = z.infer<typeof ImportJobStatusSchema>;

export type ExternalPlayerLink = {
  id: string;
  playerProfileId: string;
  source: ExternalSourceType;
  externalId: string;
  externalUrl: string;
  displayName: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
};

export type ExternalImportJob = {
  id: string;
  externalPlayerLinkId: string;
  status: ImportJobStatusType;
  startedAt: string | null;
  completedAt: string | null;
  matchesImported: number;
  matchesSkipped: number;
  statsImported: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export const CreateExternalLinkInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      (value) =>
        value.includes('wst.tv/players/') || value.includes('cuetracker.net/players/'),
      { message: 'URL must be from wst.tv or cuetracker.net' },
    ),
});
export type CreateExternalLinkInput = z.infer<typeof CreateExternalLinkInputSchema>;

export type ExternalMatchResult = {
  date: string;
  tournament: string;
  round: string | null;
  opponent: string;
  opponentExternalId?: string | null;
  referee?: string | null;
  format?: string | null;
  playerIsFirst?: boolean;
  headToHeadUrl?: string | null;
  framesWon: number;
  framesLost: number;
  frameScores: string[];
  frameDetails?: ExternalFrameDetail[];
  matchProgress?: string[];
  playerBreaks?: number[];
  opponentBreaks?: number[];
  breaks50: number;
  breaks70?: number;
  breaks100: number;
  highBreak: number | null;
  pointsFor: number;
  pointsAgainst: number;
  avgPointsFor?: number | null;
  avgPointsAgainst?: number | null;
  avgPointsTotal?: number | null;
  breakProfile?: ExternalBreakProfile | null;
  sourceUrl: string;
};

export type ExternalFrameDetail = {
  rawScore: string;
  frameNumber: number;
  playerScore: number | null;
  opponentScore: number | null;
  playerBreaks: number[];
  opponentBreaks: number[];
  winner: 'PLAYER' | 'OPPONENT' | 'UNKNOWN';
};

export type ExternalBreakProfile = {
  player: ExternalBreakBuckets;
  opponent: ExternalBreakBuckets;
};

export type ExternalBreakBuckets = {
  breaks50: number;
  breaks60: number;
  breaks70: number;
  breaks80: number;
  breaks90: number;
  breaks100: number;
  total50Plus: number;
};

export type ExternalSeasonStats = {
  season: string;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed?: number;
  framesPlayed?: number;
  framesWon?: number;
  framesLost?: number;
  pointsScored: number;
  pointsAgainst?: number;
  avgShotTime: number | null;
  breaks50: number;
  breaks60?: number;
  breaks70?: number;
  breaks80?: number;
  breaks90?: number;
  breaks100: number;
  highestBreak: number | null;
  decidingFrames?: { played: number; won: number; winRate: number | null };
  whitewashes?: { played: number; won: number; winRate: number | null };
  firstMatches?: { played: number; won: number; winRate: number | null };
  matchLengths?: Array<{ bestOf: number; played: number; won: number; winRate: number | null }>;
  roundsPlayed?: Array<{ round: string; played: number; won: number; winRate: number | null }>;
  prizeMoney?: Array<{ tournament: string; round: string | null; amount: number }>;
};

export type ExternalHeadToHeadSummary = {
  url: string;
  opponent: string;
  opponentExternalId: string;
  fetchedAt: string;
  comparison: ExternalHeadToHeadComparison | null;
  matchStats: ExternalHeadToHeadMatchStats | null;
  roundsPlayed: Array<{
    round: string;
    played: number;
    playerWins: number;
    opponentWins: number;
  }>;
};

export type ExternalHeadToHeadComparison = {
  playerLabel: string;
  opponentLabel: string;
  player: ExternalHeadToHeadPlayerComparison;
  opponent: ExternalHeadToHeadPlayerComparison;
};

export type ExternalHeadToHeadPlayerComparison = {
  seasonsAsProfessional: number | null;
  matchesPlayed: number | null;
  matchesWon: number | null;
  matchesLost: number | null;
  matchesDrawn: number | null;
  framesPlayed: number | null;
  framesWon: number | null;
  centuriesMade: number | null;
  centuryRate: number | null;
  maximumsMade: number | null;
  decidersPlayed: number | null;
  decidersWon: number | null;
  whitewashesPlayed: number | null;
  whitewashesWon: number | null;
  prizeMoney: number | null;
};

export type ExternalHeadToHeadMatchStats = {
  matchesPlayed: number;
  playerWins: number;
  opponentWins: number;
  draws: number;
  framesPlayed: number;
  playerFramesWon: number;
  opponentFramesWon: number;
};

export type ExternalImportResult = {
  matches: ExternalMatchResult[];
  seasonStats: ExternalSeasonStats | null;
  headToHeads?: ExternalHeadToHeadSummary[];
  playerName: string | null;
};
