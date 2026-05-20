'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <span className="sr-only">{t('language')}</span>
      <select
        aria-label={t('language')}
        disabled={pending}
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="rounded-md border border-border-subtle bg-background-secondary px-2 py-1 text-text-primary focus:border-border-active focus:outline-none"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-background-secondary text-text-primary">
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
