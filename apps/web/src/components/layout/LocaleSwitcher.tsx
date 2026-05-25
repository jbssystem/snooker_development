'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { useDismissable } from '@/lib/use-dismissable';
import { ChevronDown } from './ChevronDown';

export function LocaleSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const pathname = usePathname() ?? `/${locale}`;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);
  const normalizedPathname = useMemo(() => withoutLocalePrefix(pathname), [pathname]);

  function hrefFor(nextLocale: Locale) {
    return `/${nextLocale}${normalizedPathname}`;
  }

  return (
    <div className="relative z-40" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('language')}
        className="flex min-h-11 items-center gap-2 rounded-md border border-border-subtle bg-background-primary px-2.5 py-2 text-sm text-text-primary transition hover:border-brand-accent focus:border-border-active focus:outline-none"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <FlagIcon locale={locale} />
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-md border border-border-subtle bg-background-secondary py-1 shadow-glow"
          role="listbox"
        >
          {locales.map((l) => (
            <a
              key={l}
              aria-selected={l === locale}
              className={`flex min-h-11 items-center gap-3 px-3 py-2 text-sm transition ${
                l === locale
                  ? 'bg-background-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
              }`}
              href={hrefFor(l)}
              onClick={() => {
                document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`;
                setOpen(false);
              }}
              role="option"
            >
              <FlagIcon locale={l} />
              <span>{t(`languages.${l}`)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function withoutLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);

  while (isLocale(segments[0])) {
    segments.shift();
  }

  return segments.length > 0 ? `/${segments.join('/')}` : '';
}

function FlagIcon({ locale }: { locale: Locale }) {
  const commonClass = 'inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] border border-border-subtle shadow-sm';

  if (locale === 'ru') {
    return (
      <span
        aria-hidden="true"
        className={commonClass}
        style={{ background: 'linear-gradient(to bottom, #fff 0 33.33%, #1c57a7 33.33% 66.66%, #d52b1e 66.66% 100%)' }}
      />
    );
  }

  if (locale === 'uk') {
    return (
      <span
        aria-hidden="true"
        className={commonClass}
        style={{ background: 'linear-gradient(to bottom, #0057b7 0 50%, #ffd700 50% 100%)' }}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`${commonClass} relative bg-[#012169]`}>
      <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
      <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-white" />
      <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[#c8102e]" />
      <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#c8102e]" />
    </span>
  );
}
