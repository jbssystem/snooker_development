'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { localeLabels, locales } from '@/i18n/config';
import { FlagIcon } from '@/components/ui';

// A compact inline segmented control for switching the interface language.
// Links keep the visitor on the same page (next-intl strips the locale from
// `usePathname`, the `locale` prop re-adds the chosen one) and persist the
// choice in the NEXT_LOCALE cookie the middleware reads on later visits.
export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const active = useLocale();
  const pathname = usePathname();

  return (
    <div
      aria-label={localeLabels[active as keyof typeof localeLabels] ?? 'Language'}
      className={`inline-flex items-center gap-0.5 rounded-full border border-border-subtle bg-background-secondary/70 p-1 shadow-elev-1 backdrop-blur ${className}`}
      role="group"
    >
      {locales.map((l) => {
        const current = l === active;
        return (
          <Link
            key={l}
            aria-current={current ? 'true' : undefined}
            className={`press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              current
                ? 'bg-brand-accent/15 text-brand-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            href={pathname}
            locale={l}
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`;
            }}
            title={localeLabels[l]}
          >
            <FlagIcon locale={l} />
            {l}
          </Link>
        );
      })}
    </div>
  );
}
