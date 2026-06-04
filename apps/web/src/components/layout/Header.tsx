import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { HeaderShell } from './HeaderShell';
import { MainNav } from './MainNav';
import { MobileNav } from './MobileNav';
import { UserMenu } from './UserMenu';
import { CommandPaletteButton } from './CommandPaletteButton';

export async function Header({ locale }: { locale: Locale }) {
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  return (
    <HeaderShell>
        <MobileNav />
        <Link href="/dashboard" locale={locale as Locale} className="flex min-w-0 shrink-0 items-center gap-3" aria-label={tCommon('appName')}>
          {/* Desktop: icon + wordmark. Mobile (with the hamburger): wordmark only. */}
          <Image
            src="/icon-192.png"
            alt=""
            aria-hidden
            width={32}
            height={32}
            className="hidden h-8 w-8 rounded lg:block"
            priority
          />
          <span className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            <span className="text-text-primary">Snooker </span>
            <span className="text-gradient">Player OS</span>
          </span>
        </Link>
        <MainNav />
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <CommandPaletteButton />
          <UserMenu />
        </div>
    </HeaderShell>
  );
}
