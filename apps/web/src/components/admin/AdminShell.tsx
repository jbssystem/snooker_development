'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { key: 'stats', href: '/admin/stats' },
  { key: 'users', href: '/admin/users' },
  { key: 'announcements', href: '/admin/announcements' },
  { key: 'exercises', href: '/admin/exercises' },
  { key: 'aiFocusPresets', href: '/admin/ai-focus-presets' },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations('admin');
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const isAdmin = user?.roles.includes('SYSTEM_ADMIN');

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-state-error/40 bg-state-error/10 px-4 py-3 text-sm text-state-error">
        {t('forbidden')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-border-subtle pb-px">
        {TABS.map(({ key, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={key}
              href={href as never}
              className={`min-h-10 rounded-t-md px-4 py-2 text-sm transition ${
                active
                  ? 'bg-background-elevated text-text-primary shadow-elev-1 ring-1 ring-border-active'
                  : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
              }`}
            >
              {t(`tabs.${key}`)}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
