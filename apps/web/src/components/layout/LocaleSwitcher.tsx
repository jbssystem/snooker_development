'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { locales, localeFlags, localeLabels, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchLocale(next: Locale) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending || l === locale}
          onClick={() => switchLocale(l)}
          aria-label={localeLabels[l]}
          title={localeLabels[l]}
          className={`rounded-md px-1.5 py-1 text-lg leading-none transition ${
            l === locale
              ? 'bg-background-elevated ring-1 ring-border-active'
              : 'opacity-60 hover:opacity-100 hover:bg-background-elevated'
          } ${pending ? 'pointer-events-none opacity-40' : ''}`}
        >
          {localeFlags[l]}
        </button>
      ))}
    </div>
  );
}
