'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const NAV_KEYS = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'training', href: '/training' },
  { key: 'drills', href: '/drills' },
  { key: 'matches', href: '/matches' },
  { key: 'calendar', href: '/calendar' },
  { key: 'ai', href: '/ai' },
  { key: 'analytics', href: '/analytics' },
] as const;

export function MainNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="order-3 -mx-3 flex w-[calc(100%+1.5rem)] gap-1 overflow-x-auto px-3 pb-1 pt-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:px-0 md:pb-0">
      {NAV_KEYS.map(({ key, href }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={key}
            href={href as never}
            className={`min-h-10 shrink-0 rounded-md px-3 py-2 text-sm transition ${
              active
                ? 'bg-background-elevated text-text-primary ring-1 ring-border-active'
                : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}