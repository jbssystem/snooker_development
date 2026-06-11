'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
import type { DashboardDrillProgress, DrillTemplate, PlayerDashboard } from '@snooker/shared';
import { CoachInsightPanel } from '@/components/insights/CoachInsightPanel';
import { DrillDetailsModal } from '@/components/drills/DrillDetailsModal';
import { Link } from '@/i18n/navigation';
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

export function DashboardClient() {
  const t = useTranslations('dashboard');
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

      {dashboardQuery.isLoading && (
        <Card className="p-5 text-text-secondary">{t('loading')}</Card>
      )}

      {dashboardQuery.isError && (
        <p className="rounded-xl border border-state-error/40 bg-state-error/10 p-5 text-state-error">
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
  const token = useAuthStore((state) => state.tokens?.accessToken ?? null);
  const hasData = dashboard.totals.sessions > 0 || dashboard.totals.attempts > 0 || dashboard.matchSummary.matches > 0;
  const insights = buildDashboardInsights(dashboard);

  // Drill templates power the details modal opened from the progress list.
  const templatesQuery = useQuery({
    queryKey: ['drill-templates', token],
    queryFn: () => api.drills.listTemplates(token ?? ''),
    enabled: Boolean(token),
  });
  const templatesById = useMemo(() => {
    const map = new Map<string, DrillTemplate>();
    for (const template of templatesQuery.data ?? []) map.set(template.id, template);
    return map;
  }, [templatesQuery.data]);
  const [selectedDrill, setSelectedDrill] = useState<DrillTemplate | null>(null);

  return (
    <>
      {!hasData && (
        <EmptyState
          action={
            <>
              <Link href="/profile" className={secondaryButtonClass}>{t('empty.profileCta')}</Link>
              <Link href="/training" className={primaryButtonClass}>{t('empty.trainingCta')}</Link>
            </>
          }
          description={t('empty.description')}
          illustration
          title={t('empty.title')}
        />
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          <StatTile key="s" icon={<TrainingIcon />} label={t('stats.sessions')} value={formatNumber(dashboard.totals.sessions, locale)} />,
          <StatTile key="m" icon={<ClockIcon />} label={t('stats.trainingMinutes')} unit={t('units.minutes')} value={formatNumber(dashboard.totals.trainingMinutes, locale)} />,
          <StatTile key="a" icon={<TargetIcon />} label={t('stats.attempts')} value={formatNumber(dashboard.totals.attempts, locale)} />,
          <StatTile key="r" icon={<PercentIcon />} label={t('stats.successRate')} tone="gold" unit="%" value={formatNumber(dashboard.totals.successRate, locale)} />,
        ].map((tile, index) => (
          <div className="ui-rise-in" key={tile.key} style={{ animationDelay: `${index * 60}ms` }}>
            {tile}
          </div>
        ))}
      </section>

      {hasData && <CoachInsightPanel insights={insights} />}

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <SectionCard eyebrow={t('eyebrow')} title={t('charts.volume')}>
          <ResponsiveContainer height={240} width="100%">
            <BarChart data={dashboard.weeklyVolume} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="#2A323D" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="#A8B0B8" tickLine={false} />
              <YAxis stroke="#A8B0B8" tickLine={false} />
              <Tooltip content={<DashboardTooltip />} cursor={{ fill: 'rgba(25,169,116,0.08)' }} />
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
              <Tooltip content={<DashboardTooltip />} />
              <Line dataKey="successRate" dot={{ fill: '#C8A45D', r: 4 }} name={t('tooltip.successRate')} stroke="#C8A45D" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </section>

      <SectionCard title={t('matches.title')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MiniStat label={t('matches.played')} value={dashboard.matchSummary.matches} />
          <MiniStat label={t('matches.wins')} value={dashboard.matchSummary.wins} />
          <MiniStat label={t('matches.winRate')} value={`${dashboard.matchSummary.winRate}%`} />
          <MiniStat label={t('matches.frames')} value={`${dashboard.matchSummary.framesWon}–${dashboard.matchSummary.framesLost}`} />
          <MiniStat label={t('matches.highBreak')} value={dashboard.matchSummary.highBreak ?? 0} />
          <MiniStat label={t('matches.centuries')} value={dashboard.matchSummary.breaks100} />
        </div>
      </SectionCard>

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard title={t('drills.title')}>
          <div className="grid gap-3">
            {dashboard.drillProgress.map((drill) => (
              <DrillProgressRow
                key={drill.drillTemplateId}
                drill={drill}
                onOpen={() => {
                  const template = templatesById.get(drill.drillTemplateId);
                  if (template) setSelectedDrill(template);
                }}
              />
            ))}
            {dashboard.drillProgress.length === 0 && <p className="text-text-secondary">{t('drills.empty')}</p>}
          </div>
        </SectionCard>

        <SectionCard title={t('recent.title')}>
          <div className="grid gap-3">
            {dashboard.recentSessions.map((session) => (
              <article key={session.id} className="stat-tile group rounded-lg border border-border-subtle p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-text-primary transition-colors duration-200 group-hover:text-white">{session.title}</h3>
                    <p className="mt-1 text-xs text-text-disabled">{formatDate(session.startedAt, locale)}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-background-elevated px-2 py-1 text-xs text-brand-gold shadow-elev-1">
                    {session.successRate}%
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <p className="text-sm text-text-secondary">
                    {t('recent.meta', { drills: session.drillExecutions, attempts: session.attempts })}
                  </p>
                  <Link
                    href={`/training?session=${session.id}`}
                    aria-label={t('recent.openSession', { title: session.title })}
                    className="press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
                  >
                    <ArrowRightIcon />
                  </Link>
                </div>
              </article>
            ))}
            {dashboard.recentSessions.length === 0 && <p className="text-text-secondary">{t('recent.empty')}</p>}
          </div>
        </SectionCard>
      </section>

      <DrillDetailsModal
        template={selectedDrill}
        open={selectedDrill !== null}
        onClose={() => setSelectedDrill(null)}
      />
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  const locale = useLocale();
  const displayValue = typeof value === 'number' ? formatNumber(value, locale) : value;
  return (
    <div className="stat-tile group rounded-lg border border-border-subtle px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-text-disabled transition-colors duration-200 group-hover:text-text-secondary">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-text-primary transition-colors duration-200 group-hover:text-white">{displayValue}</p>
    </div>
  );
}

function DrillProgressRow({ drill, onOpen }: { drill: DashboardDrillProgress; onOpen: () => void }) {
  const t = useTranslations('dashboard');
  const tSystemDrills = useTranslations('systemDrills');
  const locale = useLocale();
  const drillName = localizeDrillName(drill.drillTemplateId, drill.drillTemplateName, tSystemDrills) ?? drill.drillTemplateName;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('drills.openDetails', { name: drillName })}
      className="stat-tile press group grid w-full gap-2 rounded-md border border-border-subtle p-3 text-left transition hover:border-brand-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-text-primary transition-colors duration-200 group-hover:text-white">{drillName}</h3>
          <p className="mt-1 text-xs text-text-disabled">{formatDate(drill.lastPracticedAt, locale)}</p>
        </div>
        <span className="rounded-md bg-background-elevated px-2 py-1 text-sm text-brand-gold">{drill.successRate}%</span>
      </div>
      <div className="sunken h-2 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-gold" style={{ width: `${Math.min(100, drill.successRate)}%` }} />
      </div>
      <p className="text-sm text-text-secondary">
        {t('drills.meta', { executions: drill.executions, attempts: drill.attempts })}
      </p>
    </button>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number }>; label?: string }) {
  const locale = useLocale();

  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-sm">
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
