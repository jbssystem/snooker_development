import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function LoginPage() {
  const t = await getTranslations('auth');
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-text-primary">{t('login.title')}</h2>
        <p className="text-sm text-text-secondary">{t('login.subtitle')}</p>
      </header>
      <AuthForm mode="login" />
      <p className="text-center text-sm text-text-secondary">
        {t('login.noAccount')}{' '}
        <Link href="/register" className="text-brand-accent hover:underline">
          {t('register.cta')}
        </Link>
      </p>
    </div>
  );
}
