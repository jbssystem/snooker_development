'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api-client';

export function UserMenu() {
  const t = useTranslations('auth');
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  const onLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore — local clear is enough */
    }
    clear();
    router.replace('/login');
  };

  if (!user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
      >
        {t('login.cta')}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-text-secondary sm:inline" title={user.email}>
        {user.displayName}
      </span>
      <button
        onClick={onLogout}
        className="rounded-md border border-border-subtle px-3 py-1.5 text-text-secondary transition hover:border-state-error hover:text-state-error"
      >
        {t('logout')}
      </button>
    </div>
  );
}
