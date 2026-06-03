import { getTranslations } from 'next-intl/server';
import { VerifyEmailClient } from '@/components/auth/VerifyEmailClient';

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const t = await getTranslations('auth');
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-text-primary">{t('verify.title')}</h2>
      </header>
      <VerifyEmailClient token={token ?? null} />
    </div>
  );
}
