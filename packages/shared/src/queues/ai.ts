export const AI_REPORT_QUEUE = 'ai-report-generation';
export const GENERATE_WEEKLY_AI_REPORT_JOB = 'generate-weekly-summary';

export type GenerateWeeklyAiReportJob = {
  reportId: string;
};