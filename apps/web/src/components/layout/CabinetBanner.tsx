'use client';

import { useTranslations } from 'next-intl';
import { useActiveProfile } from '@/lib/use-active-profile';

/**
 * Shows a banner whenever the user is acting inside someone else's cabinet, so
 * it's always clear whose data is on screen and whether it's read-only.
 */
export function CabinetBanner() {
  const t = useTranslations('sharing');
  const active = useActiveProfile();

  if (!active || active.isOwner) return null;

  const readOnly = active.accessLevel === 'VIEW';
  return (
    <div className="border-b border-border-subtle bg-background-secondary/70">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-2 text-sm sm:px-6">
        <span className="text-text-secondary">{t('banner.viewing', { name: active.displayName })}</span>
        {readOnly && (
          <span className="rounded-full border border-border-subtle px-2 py-0.5 text-xs text-text-disabled">
            {t('banner.readOnly')}
          </span>
        )}
      </div>
    </div>
  );
}
