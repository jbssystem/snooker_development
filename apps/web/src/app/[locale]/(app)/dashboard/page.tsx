import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('nav');
  const tDash = await getTranslations('dashboard');

  return (
    <main>
      <h1 className="text-3xl font-semibold text-text-primary">{t('dashboard')}</h1>
      <p className="mt-4 text-text-secondary">{tDash('placeholder')}</p>
    </main>
  );
}
