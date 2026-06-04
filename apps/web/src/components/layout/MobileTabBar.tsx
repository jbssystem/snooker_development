'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Modal } from '@/components/layout/Modal';
import {
  AiIcon,
  CalendarIcon,
  DashboardIcon,
  DrillsIcon,
  ExternalIcon,
  MatchesIcon,
  MoreIcon,
  ProfileIcon,
  TrainingIcon,
} from '@/components/ui/icons';

const PRIMARY = [
  { key: 'dashboard', href: '/dashboard', Icon: DashboardIcon },
  { key: 'training', href: '/training', Icon: TrainingIcon },
  { key: 'drills', href: '/drills', Icon: DrillsIcon },
  { key: 'matches', href: '/matches', Icon: MatchesIcon },
] as const;

const MORE = [
  { key: 'calendar', href: '/calendar', Icon: CalendarIcon },
  { key: 'ai', href: '/ai', Icon: AiIcon },
  { key: 'externalData', href: '/external-data', Icon: ExternalIcon },
  { key: 'profile', href: '/profile', Icon: ProfileIcon },
] as const;

export function MobileTabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = MORE.some(({ href }) => isActive(href));

  return (
    <>
      <nav
        aria-label={t('dashboard')}
        className="glass fixed inset-x-0 bottom-0 z-30 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {PRIMARY.map(({ key, href, Icon }) => (
            <TabLink active={isActive(href)} href={href} icon={<Icon />} key={key} label={t(key)} />
          ))}
          <button
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] transition ${
              moreActive ? 'text-brand-accent' : 'text-text-secondary'
            }`}
            onClick={() => setMoreOpen(true)}
            type="button"
          >
            <span className="h-6 w-6">
              <MoreIcon />
            </span>
            <span className="truncate">{t('more')}</span>
          </button>
        </div>
      </nav>

      <Modal closeLabel={t('more')} onClose={() => setMoreOpen(false)} open={moreOpen} title={t('more')}>
        <div className="grid grid-cols-2 gap-3">
          {MORE.map(({ key, href, Icon }) => (
            <Link
              className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                isActive(href)
                  ? 'border-brand-accent bg-background-elevated text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-brand-accent hover:text-text-primary'
              }`}
              href={href as never}
              key={key}
              onClick={() => setMoreOpen(false)}
            >
              <span className="h-5 w-5 shrink-0">
                <Icon />
              </span>
              <span className="truncate">{t(key)}</span>
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}

function TabLink({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] transition ${
        active ? 'text-brand-accent' : 'text-text-secondary'
      }`}
      href={href as never}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ${
          active ? 'bg-brand-accent/15 shadow-glow' : ''
        }`}
      >
        <span className="h-6 w-6">{icon}</span>
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
