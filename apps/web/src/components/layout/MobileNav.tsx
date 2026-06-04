'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import {
  AiIcon,
  CalendarIcon,
  DashboardIcon,
  DrillsIcon,
  ExternalIcon,
  MatchesIcon,
  TrainingIcon,
} from '@/components/ui/icons';

// Profile is intentionally omitted — it lives in the top-right avatar menu.
const NAV = [
  { key: 'dashboard', href: '/dashboard', Icon: DashboardIcon },
  { key: 'training', href: '/training', Icon: TrainingIcon },
  { key: 'drills', href: '/drills', Icon: DrillsIcon },
  { key: 'matches', href: '/matches', Icon: MatchesIcon },
  { key: 'calendar', href: '/calendar', Icon: CalendarIcon },
  { key: 'ai', href: '/ai', Icon: AiIcon },
  { key: 'externalData', href: '/external-data', Icon: ExternalIcon },
] as const;

/** Hamburger trigger + slide-in navigation drawer for small screens. */
export function MobileNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('more')}
        className="press focus-ring inline-flex h-11 w-11 items-center justify-center rounded-md border border-border-subtle bg-background-sunken text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <div aria-modal="true" className="fixed inset-0 z-50 flex" role="dialog">
          <button aria-label={t('more')} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} type="button" />
          <nav className="glass ui-pop-in relative flex h-full w-72 max-w-[82%] flex-col gap-1 overflow-y-auto p-3">
            {NAV.map(({ key, href, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={key}
                  href={href as never}
                  className={`press flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-background-elevated text-text-primary shadow-elev-1 ring-1 ring-brand-accent/30'
                      : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
                  }`}
                  onClick={close}
                >
                  <span className={`h-5 w-5 shrink-0 ${active ? 'text-brand-accent' : ''}`}>
                    <Icon />
                  </span>
                  <span className="truncate">{t(key)}</span>
                </Link>
              );
            })}
          </nav>
        </div>,
        document.body,
      )}
    </div>
  );
}
