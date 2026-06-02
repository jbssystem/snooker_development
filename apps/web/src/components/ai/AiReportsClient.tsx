'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AiReport, GenerateWeeklyAiReportInput } from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { AccordionSection } from '@/components/layout/AccordionSection';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

type GenerateFormValues = {
  periodStart: string;
  periodEnd: string;
};

type ExternalReportFrame = {
  frameNumber?: number;
  playerScore?: number | null;
  opponentScore?: number | null;
  winner?: string | null;
  highBreak?: number | null;
  notes?: string | null;
};

type ExternalReportMatch = {
  matchDate?: string;
  opponentName?: string;
  tournament?: string | null;
  round?: string | null;
  format?: string | null;
  framesWon?: number;
  framesLost?: number;
  highBreak?: number | null;
  breaks50?: number;
  breaks70?: number;
  breaks100?: number;
  result?: string;
  decidingFrameResult?: string | null;
  notes?: string | null;
  frames?: ExternalReportFrame[];
};

type ExternalReportSourceData = {
  selectedMatchCount?: number;
  matches?: ExternalReportMatch[];
};

type ExternalMatchNotes = {
  points?: {
    for?: number;
    against?: number;
    avgFor?: number | null;
    avgAgainst?: number | null;
    avgTotal?: number | null;
  };
};

export function AiReportsClient() {
  const t = useTranslations('ai');
  const tErr = useTranslations('errors.api');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const form = useForm<GenerateFormValues>({ defaultValues: weeklyDefaults() });

  const profileQuery = useQuery({
    queryKey: ['player-profile', token],
    queryFn: () => api.players.getProfile(token ?? ''),
    enabled: Boolean(token),
  });
  const reportsQuery = useQuery({
    queryKey: ['ai-reports', token],
    queryFn: () => api.ai.listReports(token ?? ''),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      const reports = query.state.data ?? [];
      return reports.some((report) => report.status === 'queued' || report.status === 'running') ? 5_000 : false;
    },
  });
  const generateReport = useMutation({
    mutationFn: (input: GenerateWeeklyAiReportInput) => api.ai.generateWeeklyReport(token ?? '', input),
    onSuccess: (report) => {
      setActiveReportId(report.id);
      queryClient.invalidateQueries({ queryKey: ['ai-reports', token] });
    },
  });

  if (!token) {
    return (
      <main className="max-w-2xl">
        <h1 className="text-3xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-3 text-text-secondary">{t('authRequired')}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary hover:bg-brand-accent"
        >
          {t('loginCta')}
        </Link>
      </main>
    );
  }

  const reports = reportsQuery.data ?? [];
  const activeReport = reports.find((report) => report.id === activeReportId) ?? reports[0] ?? null;
  const profileMissing = profileQuery.data === null;
  const serverError = generateReport.error ? errorMessage(generateReport.error, tErr) : null;

  return (
    <main className="grid gap-8 xl:grid-cols-[330px_minmax(0,1fr)_360px]">
      <aside className="rounded-lg border border-border-subtle bg-background-secondary p-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
        <div className="mt-5 grid gap-2">
          {reports.map((report) => (
            <button
              key={report.id}
              className={`rounded-md border px-3 py-2 text-left transition ${
                report.id === activeReport?.id
                  ? 'border-brand-accent bg-background-elevated text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
              }`}
              onClick={() => setActiveReportId(report.id)}
              type="button"
            >
              <span className="block truncate text-sm font-medium">{report.title ?? t('report.untitled')}</span>
              <span className="mt-1 flex items-center justify-between gap-3 text-xs text-text-disabled">
                <span>{formatDate(report.periodStart, locale)}</span>
                <StatusBadge report={report} />
              </span>
            </button>
          ))}
          {reports.length === 0 && (
            <p className="rounded-md border border-border-subtle bg-background-primary p-4 text-sm text-text-secondary">
              {reportsQuery.isLoading ? t('loading') : t('empty')}
            </p>
          )}
        </div>
      </aside>

      <section className="min-w-0 rounded-lg border border-border-subtle bg-background-secondary p-5">
        {activeReport ? <ReportDetail report={activeReport} /> : <EmptyReport />}
      </section>

      <aside className="grid gap-6 content-start">
        {profileMissing && (
          <section className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-5 text-text-secondary">
            <h2 className="text-lg font-semibold text-text-primary">{t('profileRequired.title')}</h2>
            <p className="mt-2 text-sm">{t('profileRequired.description')}</p>
            <Link href="/profile" className="mt-4 inline-flex rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary hover:bg-brand-accent">
              {t('profileRequired.cta')}
            </Link>
          </section>
        )}
        <AccordionSection defaultOpen testId="ai-generate-form" title={t('generate.title')}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => generateReport.mutate(toGenerateInput(values, locale)))}
          >
            <label className="grid gap-1 text-sm text-text-secondary">
              <span>{t('generate.periodStart')}</span>
              <input className={inputClass} type="date" {...form.register('periodStart', { required: t('required') })} />
            </label>
            <label className="grid gap-1 text-sm text-text-secondary">
              <span>{t('generate.periodEnd')}</span>
              <input className={inputClass} type="date" {...form.register('periodEnd', { required: t('required') })} />
            </label>
            {serverError && <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">{serverError}</p>}
            <button className={primaryButtonClass} disabled={generateReport.isPending || profileMissing} type="submit">
              {generateReport.isPending ? t('saving') : t('generate.submit')}
            </button>
          </form>
        </AccordionSection>
      </aside>
    </main>
  );
}

function ReportDetail({ report }: { report: AiReport }) {
  const t = useTranslations('ai');
  const locale = useLocale();
  const externalSourceData = useMemo(() => getExternalSourceData(report), [report]);
  const dataSourceRows = useMemo(
    () => [
      ['trainingSessions', report.dataSources.trainingSessions],
      ['drillExecutions', report.dataSources.drillExecutions],
      ['matches', report.dataSources.matches],
      ['calendarEvents', report.dataSources.calendarEvents],
      ['lifestyleFactors', report.dataSources.lifestyleFactors],
      ['supplementEvents', report.dataSources.supplementEvents],
      ['previousReports', report.dataSources.previousReports],
      ['externalImports', report.dataSources.externalImports],
    ] as const,
    [report],
  );

  return (
    <article className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">{report.title ?? t('report.untitled')}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {formatDate(report.periodStart, locale)} - {formatDate(report.periodEnd, locale)}
          </p>
        </div>
        <StatusBadge report={report} />
      </header>

      <dl className="grid gap-3 md:grid-cols-3">
        <Stat label={t('report.provider')} value={`${report.provider} / ${report.model}`} />
        <Stat label={t('report.promptVersion')} value={report.promptVersion} />
        <Stat label={t('report.sourceHash')} value={report.sourceDataHash.slice(0, 12)} />
      </dl>

      <section>
        <h3 className="text-lg font-semibold text-text-primary">{t('report.dataSources')}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {dataSourceRows.map(([key, value]) => <Stat key={key} label={t(`sources.${key}`)} value={String(value)} />)}
        </div>
      </section>

      {report.status === 'completed' && externalSourceData && (
        <ExternalReportVisuals sourceData={externalSourceData} />
      )}

      {report.status === 'completed' && report.contentMarkdown && (
        <section>
          <h3 className="text-lg font-semibold text-text-primary">{t('report.content')}</h3>
          <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border-subtle bg-background-primary p-4 text-sm leading-6 text-text-secondary">
            {report.contentMarkdown}
          </pre>
        </section>
      )}
      {(report.status === 'queued' || report.status === 'running') && (
        <p className="rounded-md border border-border-subtle bg-background-primary p-4 text-sm text-text-secondary">
          {t(`statusText.${report.status}`)}
        </p>
      )}
      {report.status === 'failed' && (
        <p className="rounded-md border border-state-error/40 bg-state-error/10 p-4 text-sm text-state-error">
          {report.errorMessage ?? t('statusText.failed')}
        </p>
      )}
    </article>
  );
}

function ExternalReportVisuals({ sourceData }: { sourceData: ExternalReportSourceData }) {
  const t = useTranslations('ai');
  const locale = useLocale();
  const matches = sourceData.matches ?? [];
  const chartRows = useMemo(() => matches.map((match, index) => toExternalChartRow(match, index, locale)), [matches, locale]);
  const totals = useMemo(() => summarizeExternalMatches(matches), [matches]);

  if (matches.length === 0) return null;

  return (
    <section className="grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{t('report.visuals')}</h3>
        <p className="mt-1 text-sm text-text-secondary">{t('visuals.subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('visuals.matches')} value={String(matches.length)} />
        <Stat label={t('visuals.winRate')} value={`${totals.winRate}%`} />
        <Stat label={t('visuals.frames')} value={`${totals.framesWon}:${totals.framesLost}`} />
        <Stat label={t('visuals.highBreak')} value={String(totals.highBreak || '—')} />
      </div>

      <ChartPanel title={t('visuals.pointsTrend')}>
        <ResponsiveContainer height={260} width="100%">
          <LineChart data={chartRows} margin={{ bottom: 0, left: -20, right: 16, top: 8 }}>
            <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
            <YAxis stroke="#A8B0B8" tickLine={false} />
            <Tooltip content={<ExternalTooltip />} />
            <Line dataKey="avgFor" dot={{ fill: '#19A974', r: 4 }} name={t('visuals.playerAvg')} stroke="#19A974" strokeWidth={3} type="monotone" />
            <Line dataKey="avgAgainst" dot={{ fill: '#D86F5A', r: 4 }} name={t('visuals.opponentAvg')} stroke="#D86F5A" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title={t('visuals.scoreTrend')}>
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={chartRows} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<ExternalTooltip />} cursor={{ fill: 'rgba(25,169,116,0.08)' }} />
              <Bar dataKey="framesWon" fill="#19A974" name={t('visuals.framesWon')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="framesLost" fill="#D86F5A" name={t('visuals.framesLost')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title={t('visuals.breaksTrend')}>
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={chartRows} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<ExternalTooltip />} cursor={{ fill: 'rgba(200,164,93,0.08)' }} />
              <Bar dataKey="breaks50" fill="#C8A45D" name="50+" radius={[4, 4, 0, 0]} />
              <Bar dataKey="breaks70" fill="#19A974" name="70+" radius={[4, 4, 0, 0]} />
              <Bar dataKey="breaks100" fill="#6EA8FE" name="100+" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section>
        <ChartPanel title={t('visuals.frameMap')}>
          <div className="grid gap-2">
            {matches.map((match, index) => (
              <FrameMapRow key={`${match.matchDate}-${match.opponentName}-${index}`} match={match} index={index} />
            ))}
          </div>
        </ChartPanel>
      </section>
    </section>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border-subtle bg-background-primary p-4">
      <h4 className="text-base font-semibold text-text-primary">{title}</h4>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FrameMapRow({ match, index }: { match: ExternalReportMatch; index: number }) {
  const t = useTranslations('ai');
  const label = `${index + 1}. ${match.opponentName ?? t('visuals.unknownOpponent')}`;
  const frames = match.frames ?? [];
  const orderedFrames = [...frames].sort((a, b) => (a.frameNumber ?? 0) - (b.frameNumber ?? 0));

  return (
    <div className="grid items-center gap-2 rounded-md border border-border-subtle bg-background-secondary px-3 py-2 sm:grid-cols-[minmax(96px,128px)_44px_minmax(0,1fr)]">
      <span className="truncate text-xs font-medium text-text-primary" title={label}>{label}</span>
      <span className="font-mono text-xs font-semibold text-text-secondary">{match.framesWon ?? 0}:{match.framesLost ?? 0}</span>
      <div className="overflow-x-auto">
        <div className="grid w-max grid-flow-col auto-cols-[22px] gap-1">
          {orderedFrames.map((frame) => {
            const color = frame.winner === 'PLAYER' || frame.winner === 'player'
              ? 'bg-brand-accent text-background-primary'
              : frame.winner === 'OPPONENT' || frame.winner === 'opponent'
                ? 'bg-state-error/80 text-text-primary'
                : 'bg-background-elevated text-text-disabled';
            return (
              <span
                key={frame.frameNumber}
                className={`flex h-5 w-[22px] items-center justify-center rounded-sm text-[10px] font-semibold leading-none ${color}`}
                title={`${t('visuals.frame')} ${frame.frameNumber}: ${frame.playerScore ?? 0}-${frame.opponentScore ?? 0}`}
              >
                {frame.frameNumber}
              </span>
            );
          })}
          {orderedFrames.length === 0 && <p className="text-xs text-text-disabled">{t('visuals.noFrames')}</p>}
        </div>
      </div>
    </div>
  );
}

function ExternalTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-text-primary">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-text-secondary">
          {item.name}: <span className="font-semibold text-text-primary">{item.value ?? '—'}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyReport() {
  const t = useTranslations('ai');
  return <p className="text-text-secondary">{t('empty')}</p>;
}

function StatusBadge({ report }: { report: AiReport }) {
  const t = useTranslations('ai');
  return <span className="rounded-md bg-background-elevated px-2 py-1 text-xs text-text-secondary">{t(`status.${report.status}`)}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-background-primary p-3">
      <dt className="text-xs text-text-disabled">{label}</dt>
      <dd className="mt-1 break-words font-medium text-text-primary">{value}</dd>
    </div>
  );
}

function weeklyDefaults(): GenerateFormValues {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { periodStart: toDateInput(start), periodEnd: toDateInput(end) };
}

function toGenerateInput(values: GenerateFormValues, locale: string): GenerateWeeklyAiReportInput {
  return {
    periodStart: new Date(values.periodStart).toISOString(),
    periodEnd: endOfDay(new Date(values.periodEnd)).toISOString(),
    locale: locale === 'en' || locale === 'uk' ? locale : 'ru',
  };
}

function endOfDay(value: Date): Date {
  value.setHours(23, 59, 59, 999);
  return value;
}

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function errorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError) {
    try {
      return t(error.code);
    } catch {
      return error.code;
    }
  }
  try {
    return t('generic.internal');
  } catch {
    return 'generic.internal';
  }
}

function getExternalSourceData(report: AiReport): ExternalReportSourceData | null {
  if (report.reportType !== 'external_analysis') return null;
  if (!report.sourceData || typeof report.sourceData !== 'object') return null;

  const sourceData = report.sourceData as ExternalReportSourceData;
  if (!Array.isArray(sourceData.matches)) return null;
  return sourceData;
}

function summarizeExternalMatches(matches: ExternalReportMatch[]) {
  const wins = matches.filter((match) => match.result === 'player_win').length;
  const framesWon = matches.reduce((total, match) => total + (match.framesWon ?? 0), 0);
  const framesLost = matches.reduce((total, match) => total + (match.framesLost ?? 0), 0);
  const highBreak = matches.reduce((current, match) => Math.max(current, match.highBreak ?? 0), 0);
  const winRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  return { framesLost, framesWon, highBreak, winRate };
}

function toExternalChartRow(match: ExternalReportMatch, index: number, locale: string) {
  const notes = parseJson<ExternalMatchNotes>(match.notes);
  const date = match.matchDate ? new Date(match.matchDate) : null;
  const dateLabel = date ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date) : String(index + 1);
  const opponent = match.opponentName ? shortLabel(match.opponentName, 12) : `#${index + 1}`;

  return {
    label: `${dateLabel} ${opponent}`,
    framesWon: match.framesWon ?? 0,
    framesLost: match.framesLost ?? 0,
    breaks50: match.breaks50 ?? 0,
    breaks70: match.breaks70 ?? 0,
    breaks100: match.breaks100 ?? 0,
    avgFor: notes?.points?.avgFor ?? null,
    avgAgainst: notes?.points?.avgAgainst ?? null,
    highBreak: match.highBreak ?? 0,
  };
}

function shortLabel(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const primaryButtonClass =
  'rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent disabled:opacity-60';