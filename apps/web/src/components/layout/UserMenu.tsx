'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api-client';
import { useDismissable } from '@/lib/use-dismissable';
import { PlayerAvatar } from '@/components/profile/PlayerAvatar';
import { ChevronDown } from './ChevronDown';

export function UserMenu() {
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');
  const tShare = useTranslations('sharing');
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const clear = useAuthStore((s) => s.clear);
  const accessibleProfiles = useAuthStore((s) => s.accessibleProfiles);
  const activeProfileId = useAuthStore((s) => s.activeProfileId);
  const setActiveProfile = useAuthStore((s) => s.setActiveProfile);
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['player-profile', token],
    queryFn: () => api.players.getProfile(token ?? ''),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  const switchProfile = useCallback(
    (profileId: string) => {
      if (profileId !== activeProfileId) {
        setActiveProfile(profileId);
        // Query keys are not cabinet-scoped — drop the cache so every view
        // reloads for the newly active cabinet.
        queryClient.clear();
      }
      setOpen(false);
    },
    [activeProfileId, setActiveProfile, queryClient],
  );

  const onLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore — local clear is enough */
    }
    clear();
    // Drop every cached query so the next user on this browser cannot see the
    // previous session's data (some query keys are not scoped by token).
    queryClient.clear();
    router.replace('/login');
  };

  if (!user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
      >
        {t('login.cta')}
      </button>
    );
  }

  return (
    <div className="relative z-40 text-sm" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-border-subtle bg-background-primary px-2.5 py-2 text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <PlayerAvatar avatar={profileQuery.data?.avatar ?? null} className="h-7 w-7" name={user.displayName} />
        <span className="hidden max-w-32 truncate sm:inline" title={user.email}>
          {user.displayName}
        </span>
        <ChevronDown open={open} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-md border border-border-subtle bg-background-secondary py-1 shadow-glow" role="menu">
          {accessibleProfiles.length > 1 && (
            <div className="border-b border-border-subtle/70 pb-1">
              <p className="px-3 pb-1 pt-2 text-xs uppercase tracking-wide text-text-disabled">
                {tShare('switcher.label')}
              </p>
              {accessibleProfiles.map((p) => {
                const isActive = p.profileId === (activeProfileId ?? '');
                return (
                  <button
                    key={p.profileId}
                    onClick={() => switchProfile(p.profileId)}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-background-elevated"
                    role="menuitemradio"
                    aria-checked={isActive}
                    type="button"
                  >
                    <PlayerAvatar avatar={p.avatar} className="h-6 w-6" name={p.displayName} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-text-primary">
                        {p.isOwner ? tShare('switcher.own') : p.displayName}
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {tShare(`relationships.${p.relationship}`)}
                        {p.accessLevel === 'VIEW' ? ` · ${tShare('levels.VIEW')}` : ''}
                      </span>
                    </span>
                    {isActive && <span className="text-brand-accent">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
          <Link
            href="/profile"
            className="block min-h-11 px-3 py-2.5 text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            {tNav('profile')}
          </Link>
          {user.roles.includes('SYSTEM_ADMIN') && (
            <Link
              href={'/admin/stats' as never}
              className="block min-h-11 px-3 py-2.5 text-text-secondary transition hover:bg-background-elevated hover:text-text-primary"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              {tNav('admin')}
            </Link>
          )}
          <div className="my-1 border-t border-border-subtle/70" />
          <button
            onClick={onLogout}
            className="block min-h-11 w-full px-3 py-2.5 text-left text-text-secondary transition hover:bg-background-elevated hover:text-state-error"
            role="menuitem"
            type="button"
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
