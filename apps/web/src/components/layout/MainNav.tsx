'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useDismissable } from '@/lib/use-dismissable';
import { ChevronDown } from './ChevronDown';

const PRIMARY_NAV_KEYS = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'training', href: '/training' },
  { key: 'drills', href: '/drills' },
  { key: 'matches', href: '/matches' },
] as const;

const MORE_NAV_KEYS = [
  { key: 'calendar', href: '/calendar' },
  { key: 'ai', href: '/ai' },
  { key: 'analytics', href: '/analytics' },
] as const;

export function MainNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const dropdownRef = useDismissable<HTMLDivElement>(open, close);
  const moreActive = MORE_NAV_KEYS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav className="order-3 -mx-3 flex w-[calc(100%+1.5rem)] gap-1 overflow-x-auto px-3 pb-1 pt-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:px-0 md:pb-0">
      {PRIMARY_NAV_KEYS.map(({ key, href }) => {
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
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className={`min-h-10 rounded-md px-3 py-2 text-sm transition ${
            moreActive
              ? 'bg-background-elevated text-text-primary ring-1 ring-border-active'
              : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
          }`}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            {t('more')}
            <ChevronDown open={open} />
          </span>
        </button>
        {open && (
          <div className="absolute left-0 z-30 mt-2 w-44 overflow-hidden rounded-md border border-border-subtle bg-background-secondary py-1 shadow-glow" role="menu">
            {MORE_NAV_KEYS.map(({ key, href }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={key}
                  href={href as never}
                  className={`block min-h-11 px-3 py-2.5 text-sm transition ${
                    active
                      ? 'bg-background-elevated text-text-primary'
                      : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
                  }`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  {t(key)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}