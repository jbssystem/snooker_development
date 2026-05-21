import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { HeaderShell } from './HeaderShell';
import { LocaleSwitcher } from './LocaleSwitcher';
import { MainNav } from './MainNav';
import { UserMenu } from './UserMenu';

export async function Header({ locale }: { locale: Locale }) {
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  return (
    <HeaderShell>
        <Link href="/dashboard" locale={locale as Locale} className="flex min-w-0 shrink-0 items-center gap-3">
          <Image
            src="/icon-192.png"
            alt={tCommon('appName')}
            width={32}
            height={32}
            className="h-8 w-8 rounded"
            priority
          />
          <span className="hidden max-w-[180px] truncate text-sm font-semibold tracking-wide text-text-primary sm:inline lg:max-w-none">
            {tCommon('appName')}
          </span>
        </Link>
        <MainNav />
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <LocaleSwitcher />
          <UserMenu />
        </div>
    </HeaderShell>
  );
}
