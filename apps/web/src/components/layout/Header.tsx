import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';
import { UserMenu } from './UserMenu';

const NAV_KEYS = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'training', href: '/training' },
  { key: 'drills', href: '/drills' },
  { key: 'matches', href: '/matches' },
  { key: 'calendar', href: '/calendar' },
  { key: 'ai', href: '/ai' },
  { key: 'analytics', href: '/analytics' },
  { key: 'profile', href: '/profile' },
] as const;

export async function Header() {
  const t = await getTranslations('nav');
  const tCommon = await getTranslations('common');
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-background-secondary/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:gap-6 md:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
          <Image
            src="/icon-192.png"
            alt={tCommon('appName')}
            width={32}
            height={32}
            className="h-8 w-8 rounded"
            priority
          />
          <span className="text-sm font-semibold tracking-wide text-text-primary">
            {tCommon('appName')}
          </span>
        </Link>
        <nav className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:px-0 md:pb-0">
          {NAV_KEYS.map(({ key, href }) => (
            <Link
              key={key}
              href={href as never}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
