import { PrismaClient } from '@prisma/client';
import { Worker } from 'bullmq';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  AI_REPORT_QUEUE,
  GENERATE_WEEKLY_AI_REPORT_JOB,
  type GenerateWeeklyAiReportJob,
} from '@snooker/shared';

type SourceData = {
  period?: { from?: string; to?: string };
  player?: { firstName?: string; lastName?: string; level?: string | null; seasonGoal?: string | null };
  trainingSessions?: Array<{
    title?: string;
    drillExecutions?: Array<{ attempts?: number; successes?: number; drillName?: string; errorTags?: string[] }>;
  }>;
  matches?: Array<{ result?: string; framesWon?: number; framesLost?: number; highBreak?: number | null }>;
  calendarEvents?: unknown[];
  lifestyleFactors?: Array<{ illness?: boolean; injury?: boolean; travel?: boolean; sleepHours?: number | null }>;
  supplementEvents?: unknown[];
  previousReports?: unknown[];
};

const prisma = new PrismaClient();

async function bootstrap(): Promise<void> {
  const worker = new Worker<GenerateWeeklyAiReportJob>(
    AI_REPORT_QUEUE,
    async (job) => {
      if (job.name !== GENERATE_WEEKLY_AI_REPORT_JOB) return;
      await generateWeeklySummary(job.data.reportId);
    },
    { connection: redisConnection(process.env.REDIS_URL) },
  );

  worker.on('completed', (job) => console.log(`[worker] completed ${job.name}:${job.id}`));
  worker.on('failed', (job, error) => console.error(`[worker] failed ${job?.name}:${job?.id}`, error));

  process.on('SIGTERM', () => void shutdown(worker));
  process.on('SIGINT', () => void shutdown(worker));
  console.log(`[worker] listening on ${AI_REPORT_QUEUE}`);
}

async function generateWeeklySummary(reportId: string): Promise<void> {
  const report = await prisma.aiReport.findUnique({ where: { id: reportId } });
  if (!report) return;

  await prisma.aiReport.update({ where: { id: report.id }, data: { status: 'RUNNING', errorMessage: null } });
  try {
    const sourceData = report.sourceDataJson as SourceData;
    const prompt = await weeklyPrompt(report.locale, report.periodStart, report.periodEnd, sourceData);
    const contentMarkdown = await generateMarkdown(report.provider, report.model, prompt, sourceData, report.locale);
    await prisma.aiReport.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        contentMarkdown,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.aiReport.update({
      where: { id: report.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

async function weeklyPrompt(locale: string, periodStart: Date, periodEnd: Date, sourceData: SourceData): Promise<string> {
  const templatePath = path.resolve(process.cwd(), '../../packages/ai-prompts/prompts/weekly-summary.md');
  const template = await readFile(templatePath, 'utf8');
  return template
    .replaceAll('{{locale}}', locale || 'ru')
    .replaceAll('{{periodStart}}', sourceData.period?.from ?? periodStart.toISOString())
    .replaceAll('{{periodEnd}}', sourceData.period?.to ?? periodEnd.toISOString());
}

async function generateMarkdown(
  provider: string,
  model: string,
  prompt: string,
  sourceData: SourceData,
  locale: string,
): Promise<string> {
  if (provider === 'anthropic' && process.env.AI_API_KEY) {
    return callAnthropic(model, prompt, sourceData);
  }
  return localWeeklySummary(sourceData, sourceData.period, provider, toLocale(locale));
}

async function callAnthropic(model: string, prompt: string, sourceData: SourceData): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.AI_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      system:
        'You summarize snooker development data. Never make medical claims or supplement advice. Phrase correlations as observations only.',
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nStructured JSON input:\n${JSON.stringify(sourceData, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status}`);
  }
  const body = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = body.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error('Anthropic response did not contain text');
  return text;
}

function localWeeklySummary(
  sourceData: SourceData,
  period: SourceData['period'],
  provider: string,
  locale: 'ru' | 'en' | 'uk',
): string {
  const sessions = sourceData.trainingSessions ?? [];
  const drillExecutions = sessions.flatMap((session) => session.drillExecutions ?? []);
  const attempts = sum(drillExecutions, (execution) => execution.attempts ?? 0);
  const successes = sum(drillExecutions, (execution) => execution.successes ?? 0);
  const matches = sourceData.matches ?? [];
  const lifestyleFlags = sourceData.lifestyleFactors ?? [];
  const successRate = attempts > 0 ? Math.round((successes / attempts) * 1000) / 10 : 0;
  const caveat = sessions.length < 3 ? text(locale, 'smallSample') : text(locale, 'normalSample');
  const range = `${period?.from?.slice(0, 10) ?? ''} - ${period?.to?.slice(0, 10) ?? ''}`;

  return [
    `# ${text(locale, 'title')}`,
    '',
    `_${range}_`,
    '',
    '## Highlights',
    `- ${text(locale, 'volume')}: ${sessions.length} ${text(locale, 'sessions')}, ${drillExecutions.length} ${text(locale, 'drills')}.`,
    `- ${text(locale, 'attempts')}: ${attempts}, ${text(locale, 'successRate')}: ${successRate}%.`,
    `- ${text(locale, 'matches')}: ${matches.length}.`,
    '',
    '## Numbers',
    '| Metric | Value |',
    '| --- | ---: |',
    `| ${text(locale, 'sessions')} | ${sessions.length} |`,
    `| ${text(locale, 'drills')} | ${drillExecutions.length} |`,
    `| ${text(locale, 'attempts')} | ${attempts} |`,
    `| ${text(locale, 'successRate')} | ${successRate}% |`,
    `| ${text(locale, 'matches')} | ${matches.length} |`,
    '',
    '## What improved',
    `- ${text(locale, 'fallbackImproved')}`,
    '',
    '## What stayed flat or regressed',
    `- ${text(locale, 'fallbackRegressed')}`,
    '',
    '## Suggested focus next week',
    `- ${text(locale, 'focusPractice')}`,
    `- ${text(locale, 'focusMatch')}`,
    `- ${text(locale, 'focusNotes')}`,
    '',
    '## Confidence & data caveats',
    `- ${caveat}`,
    `- ${text(locale, 'generatedLocally')} ${provider === 'anthropic' ? 'Anthropic fallback.' : 'Local fallback.'}`,
    `- ${text(locale, 'wellnessNeutral')} ${lifestyleFlags.length}.`,
  ].join('\n');
}

function toLocale(value: string): 'ru' | 'en' | 'uk' {
  return value === 'en' || value === 'uk' ? value : 'ru';
}

function text(locale: 'ru' | 'en' | 'uk', key: string): string {
  const dictionary = {
    ru: {
      title: 'Недельная AI-сводка',
      volume: 'Объём',
      sessions: 'сессий',
      drills: 'упражнений',
      attempts: 'Попытки',
      successRate: 'успешность',
      matches: 'Матчи',
      fallbackImproved: 'Для уверенного вывода о прогрессе нужен повтор по тем же упражнениям или больше данных.',
      fallbackRegressed: 'Явных просадок по сохранённым данным не выделено.',
      focusPractice: 'Повторить упражнения с наибольшим числом попыток и сверить процент успеха.',
      focusMatch: 'Связать одну тренировочную цель с ближайшим матчевым сценарием.',
      focusNotes: 'После сессий фиксировать короткую заметку о фокусе и ошибках.',
      smallSample: 'Данных меньше трёх тренировок, поэтому тренды не формулируются.',
      normalSample: 'Данных достаточно для осторожной недельной сводки.',
      generatedLocally: 'Отчёт сформирован безопасным локальным генератором:',
      wellnessNeutral: 'Wellness-факторы учтены только как нейтральный контекст, записей:',
    },
    en: {
      title: 'Weekly AI summary',
      volume: 'Volume',
      sessions: 'sessions',
      drills: 'drills',
      attempts: 'Attempts',
      successRate: 'success rate',
      matches: 'Matches',
      fallbackImproved: 'A stronger improvement read needs repeated drills or more data.',
      fallbackRegressed: 'No clear regression is visible in the saved data.',
      focusPractice: 'Repeat the highest-volume drills and compare success rate.',
      focusMatch: 'Tie one training goal to the nearest match scenario.',
      focusNotes: 'Add a short focus/error note after each session.',
      smallSample: 'Fewer than three sessions are available, so trend statements are avoided.',
      normalSample: 'There is enough data for a cautious weekly summary.',
      generatedLocally: 'Report generated by the safe local generator:',
      wellnessNeutral: 'Wellness factors are included only as neutral context, records:',
    },
    uk: {
      title: 'Тижневий AI-звіт',
      volume: 'Обсяг',
      sessions: 'сесій',
      drills: 'вправ',
      attempts: 'Спроби',
      successRate: 'успішність',
      matches: 'Матчі',
      fallbackImproved: 'Для впевненого висновку про прогрес потрібні повтори тих самих вправ або більше даних.',
      fallbackRegressed: 'Явних просідань за збереженими даними не виділено.',
      focusPractice: 'Повторити вправи з найбільшою кількістю спроб і порівняти відсоток успіху.',
      focusMatch: 'Пов’язати одну тренувальну ціль із найближчим матчевим сценарієм.',
      focusNotes: 'Після сесій фіксувати коротку нотатку про фокус і помилки.',
      smallSample: 'Даних менше трьох тренувань, тому тренди не формулюються.',
      normalSample: 'Даних достатньо для обережного тижневого звіту.',
      generatedLocally: 'Звіт сформовано безпечним локальним генератором:',
      wellnessNeutral: 'Wellness-фактори враховано лише як нейтральний контекст, записів:',
    },
  } as const;
  return dictionary[locale][key as keyof (typeof dictionary)[typeof locale]];
}

function sum<T>(items: T[], selector: (item: T) => number): number {
  return items.reduce((total, item) => total + selector(item), 0);
}

async function shutdown(worker: Worker<GenerateWeeklyAiReportJob>): Promise<void> {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

function redisConnection(redisUrl: string | undefined) {
  const parsed = new URL(redisUrl || 'redis://localhost:6379');
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0,
  };
}

void bootstrap();
