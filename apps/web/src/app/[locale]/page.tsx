import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  const sections = ['training', 'analytics', 'ai', 'continuity'] as const;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-6">
        <Image
          src="/logo.png"
          alt={tCommon('appName')}
          width={420}
          height={120}
          priority
          className="h-16 w-auto"
        />
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
          {tCommon('appName')}
        </p>
        <h1 className="text-4xl font-semibold text-text-primary sm:text-5xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-lg text-text-secondary">{t('subtitle')}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/register"
            className="rounded-md bg-brand-primary px-5 py-2.5 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent"
          >
            {t('cta.register')}
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border-subtle px-5 py-2.5 font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
          >
            {t('cta.login')}
          </Link>
          <a
            href="#sections"
            className="rounded-md border border-transparent px-5 py-2.5 font-medium text-text-disabled transition hover:text-text-secondary"
          >
            {t('cta.learnMore')}
          </a>
        </div>
      </header>

      <section id="sections" className="grid gap-4 sm:grid-cols-2">
        {sections.map((key) => (
          <article
            key={key}
            className="rounded-lg border border-border-subtle bg-background-secondary p-5 transition hover:border-brand-accent hover:bg-background-elevated"
          >
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              {t(`sections.${key}.title`)}
            </h2>
            <p className="text-sm text-text-secondary">
              {t(`sections.${key}.description`)}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
