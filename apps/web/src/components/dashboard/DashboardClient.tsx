'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
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
import type { DashboardDrillProgress, PlayerDashboard } from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export function DashboardClient() {
  const t = useTranslations('dashboard');
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const dashboardQuery = useQuery({
    queryKey: ['player-dashboard', token],
    queryFn: () => api.dashboard.getPlayerDashboard(token ?? ''),
    enabled: Boolean(token),
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

  const dashboard = dashboardQuery.data;

  return (
    <main className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">{t('title')}</h1>
          <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        </div>
        {dashboard && (
          <p className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary">
            {t('period', { days: dashboard.period.days })}
          </p>
        )}
      </header>

      {dashboardQuery.isLoading && (
        <p className="rounded-lg border border-border-subtle bg-background-secondary p-5 text-text-secondary">
          {t('loading')}
        </p>
      )}

      {dashboardQuery.isError && (
        <p className="rounded-lg border border-state-error/40 bg-state-error/10 p-5 text-state-error">
          {t('error')}
        </p>
      )}

      {dashboard && <DashboardContent dashboard={dashboard} />}
    </main>
  );
}

function DashboardContent({ dashboard }: { dashboard: PlayerDashboard }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const hasData = dashboard.totals.sessions > 0 || dashboard.totals.attempts > 0 || dashboard.matchSummary.matches > 0;

  return (
    <>
      {!hasData && (
        <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('empty.title')}</h2>
          <p className="mt-2 text-text-secondary">{t('empty.description')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className={secondaryButtonClass}>{t('empty.profileCta')}</Link>
            <Link href="/training" className={primaryButtonClass}>{t('empty.trainingCta')}</Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('stats.sessions')} value={dashboard.totals.sessions} />
        <StatCard label={t('stats.trainingMinutes')} value={dashboard.totals.trainingMinutes} suffix={t('units.minutes')} />
        <StatCard label={t('stats.attempts')} value={dashboard.totals.attempts} />
        <StatCard label={t('stats.successRate')} value={dashboard.totals.successRate} suffix="%" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title={t('charts.volume')}>
          <ResponsiveContainer height={260} width="100%">
            <BarChart data={dashboard.weeklyVolume} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<DashboardTooltip />} cursor={{ fill: 'rgba(25,169,116,0.08)' }} />
              <Bar dataKey="trainingMinutes" fill="#19A974" name={t('tooltip.trainingMinutes')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title={t('charts.successTrend')}>
          <ResponsiveContainer height={260} width="100%">
            <LineChart data={dashboard.weeklyVolume} margin={{ bottom: 0, left: -20, right: 16, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<DashboardTooltip />} />
              <Line dataKey="successRate" dot={{ fill: '#C8A45D', r: 4 }} name={t('tooltip.successRate')} stroke="#C8A45D" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
        <h2 className="text-xl font-semibold text-text-primary">{t('matches.title')}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label={t('matches.played')} value={dashboard.matchSummary.matches} />
          <StatCard label={t('matches.wins')} value={dashboard.matchSummary.wins} />
          <StatCard label={t('matches.winRate')} value={dashboard.matchSummary.winRate} suffix="%" />
          <StatCard label={t('matches.frames')} value={`${dashboard.matchSummary.framesWon}:${dashboard.matchSummary.framesLost}`} />
          <StatCard label={t('matches.highBreak')} value={dashboard.matchSummary.highBreak ?? 0} />
          <StatCard label={t('matches.centuries')} value={dashboard.matchSummary.breaks100} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('drills.title')}</h2>
          <div className="mt-5 grid gap-3">
            {dashboard.drillProgress.map((drill) => <DrillProgressRow key={drill.drillTemplateId} drill={drill} />)}
            {dashboard.drillProgress.length === 0 && <p className="text-text-secondary">{t('drills.empty')}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-background-secondary p-5">
          <h2 className="text-xl font-semibold text-text-primary">{t('recent.title')}</h2>
          <div className="mt-5 grid gap-3">
            {dashboard.recentSessions.map((session) => (
              <article key={session.id} className="rounded-md border border-border-subtle bg-background-primary p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-text-primary">{session.title}</h3>
                    <p className="mt-1 text-xs text-text-disabled">{formatDate(session.startedAt, locale)}</p>
                  </div>
                  <span className="rounded-md bg-background-elevated px-2 py-1 text-xs text-text-secondary">
                    {session.successRate}%
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  {t('recent.meta', { drills: session.drillExecutions, attempts: session.attempts })}
                </p>
              </article>
            ))}
            {dashboard.recentSessions.length === 0 && <p className="text-text-secondary">{t('recent.empty')}</p>}
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  const locale = useLocale();
  const displayValue = typeof value === 'number' ? formatNumber(value, locale) : value;

  return (
    <article className="rounded-lg border border-border-subtle bg-background-secondary p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-text-primary">
        {displayValue}{suffix ? <span className="ml-1 text-base text-text-secondary">{suffix}</span> : null}
      </p>
    </article>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border-subtle bg-background-secondary p-5">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DrillProgressRow({ drill }: { drill: DashboardDrillProgress }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  return (
    <article className="grid gap-2 rounded-md border border-border-subtle bg-background-primary p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-text-primary">{drill.drillTemplateName}</h3>
          <p className="mt-1 text-xs text-text-disabled">{formatDate(drill.lastPracticedAt, locale)}</p>
        </div>
        <span className="rounded-md bg-background-elevated px-2 py-1 text-sm text-brand-gold">{drill.successRate}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background-elevated">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.min(100, drill.successRate)}%` }} />
      </div>
      <p className="text-sm text-text-secondary">
        {t('drills.meta', { executions: drill.executions, attempts: drill.attempts })}
      </p>
    </article>
  );
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }) {
  const locale = useLocale();

  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-sm shadow-glow">
      <p className="font-medium text-text-primary">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-text-secondary">
          {item.name}: {formatNumber(item.value ?? 0, locale)}
        </p>
      ))}
    </div>
  );
}

const primaryButtonClass =
  'rounded-md bg-brand-primary px-4 py-2 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent';
const secondaryButtonClass =
  'rounded-md border border-border-subtle px-4 py-2 font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary';

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
