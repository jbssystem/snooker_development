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
  { key: 'analytics', href: '/analytics' },
] as const;

export async function Header() {
  const t = await getTranslations('nav');
  const tCommon = await getTranslations('common');
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-background-secondary/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/icon.png"
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
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_KEYS.map(({ key, href }) => (
            <Link
              key={key}
              href={href as never}
              className="rounded-md px-3 py-1.5 text-sm text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
