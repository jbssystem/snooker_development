'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Keeps the store's list of accessible cabinets in sync with the server and
 * ensures the selected cabinet is always valid (defaulting to the owned one).
 * Renders nothing — mounted once in the app layout.
 */
export function ActiveProfileSync() {
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const activeProfileId = useAuthStore((s) => s.activeProfileId);
  const setAccessibleProfiles = useAuthStore((s) => s.setAccessibleProfiles);
  const setActiveProfile = useAuthStore((s) => s.setActiveProfile);

  const query = useQuery({
    queryKey: ['accessible-profiles', token],
    queryFn: () => api.profiles.accessible(token ?? ''),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    const profiles = query.data;
    if (!profiles) return;
    setAccessibleProfiles(profiles);
    const stillValid = activeProfileId && profiles.some((p) => p.profileId === activeProfileId);
    if (!stillValid) {
      const fallback = profiles.find((p) => p.isOwner) ?? profiles[0] ?? null;
      setActiveProfile(fallback?.profileId ?? null);
    }
  }, [query.data, activeProfileId, setAccessibleProfiles, setActiveProfile]);

  return null;
}
