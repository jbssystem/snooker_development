'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AiReport, GenerateWeeklyAiReportInput } from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { AccordionSection } from '@/components/layout/AccordionSection';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

type GenerateFormValues = {
  periodStart: string;
  periodEnd: string;
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
        <AccordionSection testId="ai-generate-form" title={t('generate.title')}>
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
  const dataSourceRows = useMemo(
    () => [
      ['trainingSessions', report.dataSources.trainingSessions],
      ['drillExecutions', report.dataSources.drillExecutions],
      ['matches', report.dataSources.matches],
      ['calendarEvents', report.dataSources.calendarEvents],
      ['lifestyleFactors', report.dataSources.lifestyleFactors],
      ['supplementEvents', report.dataSources.supplementEvents],
      ['previousReports', report.dataSources.previousReports],
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

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const primaryButtonClass =
  'rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent disabled:opacity-60';