'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
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
import { CoachInsightPanel } from '@/components/insights/CoachInsightPanel';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { localizeDrillName } from '@/lib/drill-localization';
import { buildDashboardInsights } from '@/lib/player-insights';
import {
  Card,
  EmptyState,
  PageHeader,
  SectionCard,
  StatTile,
  ClockIcon,
  PercentIcon,
  TargetIcon,
  TrainingIcon,
} from '@/components/ui';

export function AnalyticsClient() {
  const t = useTranslations('analytics');
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const dashboardQuery = useQuery({
    queryKey: ['player-dashboard', token],
    queryFn: () => api.dashboard.getPlayerDashboard(token ?? ''),
    enabled: Boolean(token),
  });

  const dashboard = dashboardQuery.data;

  return (
    <main className="grid gap-6">
      <PageHeader
        actions={
          dashboard ? (
            <span className="rounded-full border border-border-subtle bg-background-secondary px-3 py-1.5 text-sm text-text-secondary">
              {t('period', { days: dashboard.period.days })}
            </span>
          ) : undefined
        }
        eyebrow={t('eyebrow')}
        subtitle={t('subtitle')}
        title={t('title')}
      />

      {dashboardQuery.isLoading && <Card className="p-5 text-text-secondary">{t('loading')}</Card>}

      {dashboardQuery.isError && (
        <p className="rounded-xl border border-state-error/40 bg-state-error/10 p-5 text-state-error">
          {t('error')}
        </p>
      )}

      {dashboard && <AnalyticsContent dashboard={dashboard} />}
    </main>
  );
}

function AnalyticsContent({ dashboard }: { dashboard: PlayerDashboard }) {
  const t = useTranslations('analytics');
  const locale = useLocale();
  const hasData = dashboard.totals.sessions > 0 || dashboard.totals.attempts > 0 || dashboard.matchSummary.matches > 0;
  const insights = buildDashboardInsights(dashboard);

  return (
    <>
      {!hasData && <EmptyState illustration title={t('empty')} />}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={<TrainingIcon />} label={t('stats.sessions')} value={formatNumber(dashboard.totals.sessions, locale)} />
        <StatTile icon={<ClockIcon />} label={t('stats.trainingMinutes')} unit={t('units.minutes')} value={formatNumber(dashboard.totals.trainingMinutes, locale)} />
        <StatTile icon={<TargetIcon />} label={t('stats.attempts')} value={formatNumber(dashboard.totals.attempts, locale)} />
        <StatTile icon={<PercentIcon />} label={t('stats.successRate')} tone="gold" unit="%" value={formatNumber(dashboard.totals.successRate, locale)} />
      </section>

      {hasData && <CoachInsightPanel insights={insights} />}

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <SectionCard eyebrow={t('eyebrow')} title={t('charts.volume')}>
          <ResponsiveContainer height={240} width="100%">
            <BarChart data={dashboard.weeklyVolume} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: 'rgba(25,169,116,0.08)' }} />
              <Bar dataKey="trainingMinutes" fill="#19A974" name={t('tooltip.trainingMinutes')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard eyebrow={t('eyebrow')} title={t('charts.successTrend')}>
          <ResponsiveContainer height={240} width="100%">
            <LineChart data={dashboard.weeklyVolume} margin={{ bottom: 0, left: -20, right: 16, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<AnalyticsTooltip />} />
              <Line dataKey="successRate" dot={{ fill: '#C8A45D', r: 4 }} name={t('tooltip.successRate')} stroke="#C8A45D" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </section>

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title={t('drills.title')}>
          <div className="grid gap-3">
            {dashboard.drillProgress.map((drill, i) => (
              <div key={drill.drillTemplateId} className="ui-rise-in" style={{ animationDelay: `${i * 60}ms` }}>
                <DrillProgressRow drill={drill} />
              </div>
            ))}
            {dashboard.drillProgress.length === 0 && <p className="text-text-secondary">{t('drills.empty')}</p>}
          </div>
        </SectionCard>

        <SectionCard title={t('matches.title')}>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label={t('matches.played')} value={dashboard.matchSummary.matches} />
            <MiniStat label={t('matches.winRate')} value={`${dashboard.matchSummary.winRate}%`} />
            <MiniStat label={t('matches.frames')} value={`${dashboard.matchSummary.framesWon}:${dashboard.matchSummary.framesLost}`} />
            <MiniStat label={t('matches.highBreak')} value={dashboard.matchSummary.highBreak ?? 0} />
          </div>
        </SectionCard>
      </section>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  const locale = useLocale();
  const displayValue = typeof value === 'number' ? formatNumber(value, locale) : value;
  return (
    <div className="sunken rounded-lg border border-border-subtle px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-text-disabled">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-text-primary">{displayValue}</p>
    </div>
  );
}

function DrillProgressRow({ drill }: { drill: DashboardDrillProgress }) {
  const t = useTranslations('analytics');
  const tSystemDrills = useTranslations('systemDrills');
  const locale = useLocale();
  const drillName = localizeDrillName(drill.drillTemplateId, drill.drillTemplateName, tSystemDrills) ?? drill.drillTemplateName;

  return (
    <article className="grid gap-2 rounded-md border border-border-subtle bg-background-primary p-3 shadow-elev-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-text-primary">{drillName}</h3>
          <p className="mt-1 text-xs text-text-disabled">{formatDate(drill.lastPracticedAt, locale)}</p>
        </div>
        <span className="rounded-md bg-background-elevated px-2 py-1 text-sm text-brand-gold">{drill.successRate}%</span>
      </div>
      <div className="sunken h-2 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${Math.min(100, drill.successRate)}%` }} />
      </div>
      <p className="text-sm text-text-secondary">
        {t('drills.meta', { executions: drill.executions, attempts: drill.attempts })}
      </p>
    </article>
  );
}

function AnalyticsTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }) {
  const locale = useLocale();

  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-sm shadow-elev-3">
      <p className="font-medium text-text-primary">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-text-secondary">
          {item.name}: {formatNumber(item.value ?? 0, locale)}
        </p>
      ))}
    </div>
  );
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}