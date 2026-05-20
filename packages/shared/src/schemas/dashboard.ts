import { z } from 'zod';

export const DashboardPeriodSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  days: z.number().int().positive(),
});
export type DashboardPeriod = z.infer<typeof DashboardPeriodSchema>;

export const DashboardTotalsSchema = z.object({
  sessions: z.number().int().min(0),
  finishedSessions: z.number().int().min(0),
  openSessions: z.number().int().min(0),
  trainingMinutes: z.number().int().min(0),
  drillExecutions: z.number().int().min(0),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  successRate: z.number().min(0).max(100),
});
export type DashboardTotals = z.infer<typeof DashboardTotalsSchema>;

export const DashboardWeeklyPointSchema = z.object({
  weekStart: z.string().datetime(),
  label: z.string(),
  sessions: z.number().int().min(0),
  trainingMinutes: z.number().int().min(0),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  successRate: z.number().min(0).max(100),
});
export type DashboardWeeklyPoint = z.infer<typeof DashboardWeeklyPointSchema>;

export const DashboardDrillProgressSchema = z.object({
  drillTemplateId: z.string().cuid(),
  drillTemplateName: z.string(),
  executions: z.number().int().min(0),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  successRate: z.number().min(0).max(100),
  lastPracticedAt: z.string().datetime(),
});
export type DashboardDrillProgress = z.infer<typeof DashboardDrillProgressSchema>;

export const DashboardMatchSummarySchema = z.object({
  matches: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  draws: z.number().int().min(0),
  framesWon: z.number().int().min(0),
  framesLost: z.number().int().min(0),
  winRate: z.number().min(0).max(100),
  highBreak: z.number().int().min(0).optional(),
  breaks50: z.number().int().min(0),
  breaks70: z.number().int().min(0),
  breaks100: z.number().int().min(0),
});
export type DashboardMatchSummary = z.infer<typeof DashboardMatchSummarySchema>;

export const DashboardRecentSessionSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  sessionType: z.enum(['solo', 'coached', 'match_prep', 'review', 'other']),
  drillExecutions: z.number().int().min(0),
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  successRate: z.number().min(0).max(100),
});
export type DashboardRecentSession = z.infer<typeof DashboardRecentSessionSchema>;

export const PlayerDashboardSchema = z.object({
  period: DashboardPeriodSchema,
  totals: DashboardTotalsSchema,
  weeklyVolume: z.array(DashboardWeeklyPointSchema),
  drillProgress: z.array(DashboardDrillProgressSchema),
  matchSummary: DashboardMatchSummarySchema,
  recentSessions: z.array(DashboardRecentSessionSchema),
});
export type PlayerDashboard = z.infer<typeof PlayerDashboardSchema>;
