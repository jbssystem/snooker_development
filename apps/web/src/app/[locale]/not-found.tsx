import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <main className="grid min-h-screen place-items-center bg-background-primary text-text-primary">
      <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
    </main>
  );
}