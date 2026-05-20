import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function RegisterPage() {
  const t = await getTranslations('auth');
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-text-primary">{t('register.title')}</h2>
        <p className="text-sm text-text-secondary">{t('register.subtitle')}</p>
      </header>
      <AuthForm mode="register" />
      <p className="text-center text-sm text-text-secondary">
        {t('register.hasAccount')}{' '}
        <Link href="/login" className="text-brand-accent hover:underline">
          {t('login.cta')}
        </Link>
      </p>
    </div>
  );
}
