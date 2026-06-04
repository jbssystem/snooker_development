'use client';

import { useMemo } from 'react';
import type { AccessibleProfile } from '@snooker/shared';
import { selectActiveProfile, useAuthStore } from '@/lib/auth-store';

/** The cabinet the user is currently acting in (own or shared), or null. */
export function useActiveProfile(): AccessibleProfile | null {
  const activeProfileId = useAuthStore((s) => s.activeProfileId);
  const accessibleProfiles = useAuthStore((s) => s.accessibleProfiles);
  return useMemo(
    () => selectActiveProfile({ activeProfileId, accessibleProfiles }),
    [activeProfileId, accessibleProfiles],
  );
}

/**
 * Whether the user can mutate the active cabinet's data. True for owners and
 * editors, and for a brand-new user with no cabinet yet (bootstrapping their
 * own profile). False for view-only shared cabinets.
 */
export function useCanEdit(): boolean {
  const active = useActiveProfile();
  return active ? active.isOwner || active.accessLevel === 'EDIT' : true;
}

/** Whether the active cabinet grants access to sensitive wellness data. */
export function useCanAccessWellness(): boolean {
  const active = useActiveProfile();
  return active ? active.canAccessWellness : true;
}
