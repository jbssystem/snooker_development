'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { localizeDrillName } from '@/lib/drill-localization';
import type { DashboardInsight, InsightTone, InsightValues } from '@/lib/player-insights';

type CoachInsightPanelProps = {
  insights: DashboardInsight[];
};

export function CoachInsightPanel({ insights }: CoachInsightPanelProps) {
  const t = useTranslations('insights');
  const tSystemDrills = useTranslations('systemDrills');

  if (insights.length === 0) return null;

  return (
    <section className="grid gap-4" data-testid="coach-insight-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">{t('eyebrow')}</p>
          <h2 className="mt-1 text-xl font-semibold text-text-primary">{t('title')}</h2>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => {
          const values = insightValues(insight, tSystemDrills);

          return (
            <article
              key={insight.id}
              className={`stat-tile group grid min-h-[220px] content-between gap-4 rounded-lg border p-4 ${insight.tone === 'gold' ? 'stat-tile-gold' : ''} ${toneClass(insight.tone)}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-text-disabled transition-colors duration-200 group-hover:text-text-secondary">{t(`metrics.${insight.metricKey}`)}</p>
                    <p className="mt-1 text-3xl font-semibold text-text-primary transition-colors duration-200 group-hover:text-text-primary">{insight.metricValue}</p>
                  </div>
                  <span className="rounded-md bg-background-primary px-2 py-1 text-xs text-text-secondary">
                    {t('confidence', { confidence: insight.confidence })}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-text-primary">
                  {t(`cards.${insight.titleKey}.title`, values)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {t(`cards.${insight.bodyKey}.body`, values)}
                </p>
              </div>

              <div className="grid gap-3">
                <p className="rounded-md bg-background-primary px-3 py-2 text-sm text-text-secondary">
                  {t(`cards.${insight.actionKey}.action`, values)}
                </p>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition hover:border-brand-accent hover:text-brand-accent"
                  href={insight.href}
                >
                  {t('open')}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function insightValues(insight: DashboardInsight, tSystemDrills: ReturnType<typeof useTranslations>): InsightValues {
  const values: InsightValues = { ...insight.values };
  if (insight.drillTemplateName) {
    values.drill = localizeDrillName(insight.drillTemplateId, insight.drillTemplateName, tSystemDrills) ?? insight.drillTemplateName;
  }
  return values;
}

function toneClass(tone: InsightTone): string {
  if (tone === 'accent') return 'border-brand-accent/70 shadow-glow';
  if (tone === 'gold') return 'border-brand-gold/70';
  if (tone === 'warning') return 'border-state-warning/70';
  return 'border-border-subtle';
}