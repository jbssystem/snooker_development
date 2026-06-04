'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Discoverable header trigger for the command palette. */
export function CommandPaletteButton() {
  const t = useTranslations('command');
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/mac/i.test(navigator.platform));
  }, []);

  return (
    <button
      aria-label={t('open')}
      className="press focus-ring inline-flex min-h-11 items-center gap-2 rounded-md border border-border-subtle bg-background-sunken px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
      onClick={() => window.dispatchEvent(new Event('commandpalette:open'))}
      type="button"
    >
      <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" strokeLinecap="round" />
      </svg>
      <kbd className="hidden rounded border border-border-subtle px-1.5 py-0.5 text-[10px] font-medium tracking-wide md:block">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
    </button>
  );
}
