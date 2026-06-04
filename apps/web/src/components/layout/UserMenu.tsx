'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api-client';
import { useDismissable } from '@/lib/use-dismissable';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { ChevronDown } from './ChevronDown';

export function UserMenu() {
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const rawPathname = usePathname() ?? `/${locale}`;
  const normalizedPathname = useMemo(() => withoutLocalePrefix(rawPathname), [rawPathname]);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ['player-profile', token],
    queryFn: () => api.players.getProfile(token ?? ''),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  const onLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore — local clear is enough */
    }
    clear();
    // Drop every cached query so the next user on this browser cannot see the
    // previous session's data (some query keys are not scoped by token).
    queryClient.clear();
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
    <div className="relative z-40 text-sm" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border-subtle bg-background-primary px-2.5 py-2 text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <PlayerAvatar avatar={profileQuery.data?.avatar ?? null} className="h-7 w-7" name={user.displayName} />
        <span className="hidden max-w-32 truncate sm:inline" title={user.email}>
          {user.displayName}
        </span>
        <ChevronDown open={open} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border border-border-subtle bg-background-secondary py-1 shadow-glow" role="menu">
          <Link
            href="/profile"
            className="block min-h-11 px-3 py-2.5 text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            {tNav('profile')}
          </Link>
          {user.roles.includes('SYSTEM_ADMIN') && (
            <Link
              href={'/admin/stats' as never}
              className="block min-h-11 px-3 py-2.5 text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              {tNav('admin')}
            </Link>
          )}
          <div className="my-1 border-t border-border-subtle/70" />
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-text-disabled">
            {tCommon('language')}
          </p>
          {locales.map((l) => (
            <a
              key={l}
              aria-current={l === locale ? 'true' : undefined}
              className={`flex min-h-10 items-center gap-2.5 px-3 py-2 text-sm transition ${
                l === locale
                  ? 'bg-background-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
              }`}
              href={`/${l}${normalizedPathname}`}
              onClick={() => {
                document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`;
                setOpen(false);
              }}
              role="menuitem"
            >
              <FlagIcon locale={l} />
              <span>{tCommon(`languages.${l}`)}</span>
            </a>
          ))}
          <div className="my-1 border-t border-border-subtle/70" />
          <button
            onClick={onLogout}
            className="block min-h-11 w-full px-3 py-2.5 text-left text-text-secondary transition hover:bg-background-elevated hover:text-state-error"
            role="menuitem"
            type="button"
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}

function withoutLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  while (isLocale(segments[0])) {
    segments.shift();
  }
  return segments.length > 0 ? `/${segments.join('/')}` : '';
}

function FlagIcon({ locale }: { locale: Locale }) {
  const commonClass = 'inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] border border-border-subtle shadow-sm';

  if (locale === 'ru') {
    return (
      <span
        aria-hidden="true"
        className={commonClass}
        style={{ background: 'linear-gradient(to bottom, #fff 0 33.33%, #1c57a7 33.33% 66.66%, #d52b1e 66.66% 100%)' }}
      />
    );
  }

  if (locale === 'uk') {
    return (
      <span
        aria-hidden="true"
        className={commonClass}
        style={{ background: 'linear-gradient(to bottom, #0057b7 0 50%, #ffd700 50% 100%)' }}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`${commonClass} relative bg-[#012169]`}>
      <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
      <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-white" />
      <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[#c8102e]" />
      <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#c8102e]" />
    </span>
  );
}
