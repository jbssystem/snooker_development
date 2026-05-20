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
  recentSessions: z.array(DashboardRecentSessionSchema),
});
export type PlayerDashboard = z.infer<typeof PlayerDashboardSchema>;
