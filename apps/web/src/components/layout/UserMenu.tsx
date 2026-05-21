'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api-client';

export function UserMenu() {
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');
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
        className="min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
      >
        {t('login.cta')}
      </button>
    );
  }

  return (
    <details className="group relative text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border-subtle bg-background-primary px-2.5 py-2 text-text-secondary transition hover:border-brand-accent hover:text-text-primary [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold uppercase text-text-primary">
          {initials(user.displayName)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline" title={user.email}>
          {user.displayName}
        </span>
        <span className="text-text-disabled" aria-hidden="true">v</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border border-border-subtle bg-background-secondary py-1 shadow-glow">
        <Link
          href="/profile"
          className="block min-h-11 px-3 py-2.5 text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
        >
          {tNav('profile')}
        </Link>
        <button
          onClick={onLogout}
          className="block min-h-11 w-full px-3 py-2.5 text-left text-text-secondary transition hover:bg-background-elevated hover:text-state-error"
          type="button"
        >
          {t('logout')}
        </button>
      </div>
    </details>
  );
}

function initials(displayName: string): string {
  return displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('') || '?';
}
