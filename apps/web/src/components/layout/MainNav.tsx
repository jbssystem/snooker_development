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
  { key: 'externalData', href: '/external-data' },
] as const;

export function MainNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const dropdownRef = useDismissable<HTMLDivElement>(open, close);
  const moreActive = MORE_NAV_KEYS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav className="hidden flex-1 gap-1 lg:flex">
      {PRIMARY_NAV_KEYS.map(({ key, href }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={key}
            href={href as never}
            className={`press focus-ring min-h-10 shrink-0 rounded-md px-3 py-2 text-sm transition ${
              active
                ? 'bg-background-elevated text-text-primary shadow-elev-1 ring-1 ring-border-active'
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
          className={`press focus-ring min-h-10 rounded-md px-3 py-2 text-sm transition ${
            moreActive
              ? 'bg-background-elevated text-text-primary shadow-elev-1 ring-1 ring-border-active'
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
          <div className="glass ui-pop-in absolute left-0 z-30 mt-2 w-44 overflow-hidden rounded-lg py-1" role="menu">
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