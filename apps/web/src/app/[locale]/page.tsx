import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Wordmark } from '@/components/brand/Wordmark';
import { AiIcon, AnalyticsIcon, CalendarIcon, TrainingIcon } from '@/components/ui/icons';

type Props = { params: Promise<{ locale: string }> };

const SECTION_ICONS = {
  training: TrainingIcon,
  analytics: AnalyticsIcon,
  ai: AiIcon,
  continuity: CalendarIcon,
} as const;

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  const sections = ['training', 'analytics', 'ai', 'continuity'] as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-14 px-6 py-16 sm:py-20">
      <header className="flex flex-col gap-6">
        <Wordmark label={tCommon('appName')} />
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">{tCommon('appName')}</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          <span className="text-gradient">{t('title')}</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-text-secondary">{t('subtitle')}</p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/register" className="btn-primary px-6 text-base">
            {t('cta.register')}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-md border border-border-subtle px-5 py-2.5 font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
          >
            {t('cta.login')}
          </Link>
          <a
            href="#sections"
            className="inline-flex min-h-11 items-center px-3 py-2.5 font-medium text-text-disabled transition hover:text-text-secondary sm:hidden"
          >
            {t('cta.learnMore')}
          </a>
        </div>
      </header>

      <section id="sections" className="grid gap-4 sm:grid-cols-2">
        {sections.map((key) => {
          const Icon = SECTION_ICONS[key];
          return (
            <article key={key} className="surface surface-hover accent-top rounded-xl p-6">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent/30 to-brand-primary/5 text-brand-accent ring-1 ring-brand-accent/25">
                <span className="h-5 w-5">
                  <Icon />
                </span>
              </span>
              <h2 className="mb-2 text-xl font-semibold tracking-tight text-text-primary">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="text-sm leading-relaxed text-text-secondary">
                {t(`sections.${key}.description`)}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
