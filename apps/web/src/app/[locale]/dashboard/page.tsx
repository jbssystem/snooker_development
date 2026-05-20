import { getTranslations } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale: _locale } = await params;
  const t = await getTranslations('nav');

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-text-primary">{t('dashboard')}</h1>
      <p className="mt-4 text-text-secondary">
        TODO: player overview, weekly progress, recent sessions, AI insights.
      </p>
    </main>
  );
}
