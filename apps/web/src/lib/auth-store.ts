'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AccessibleProfile, AuthMe, Tokens } from '@snooker/shared';

type AuthState = {
  user: AuthMe | null;
  tokens: Tokens | null;
  // Delegated access: the cabinet the user is currently acting in, plus the
  // list of cabinets they can switch between (own + shared).
  activeProfileId: string | null;
  accessibleProfiles: AccessibleProfile[];
  setSession: (session: { user: AuthMe; tokens: Tokens }) => void;
  setTokens: (tokens: Tokens) => void;
  setActiveProfile: (profileId: string | null) => void;
  setAccessibleProfiles: (profiles: AccessibleProfile[]) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      activeProfileId: null,
      accessibleProfiles: [],
      setSession: ({ user, tokens }) => set({ user, tokens }),
      setTokens: (tokens) => set({ tokens }),
      setActiveProfile: (activeProfileId) => set({ activeProfileId }),
      setAccessibleProfiles: (accessibleProfiles) => set({ accessibleProfiles }),
      clear: () =>
        set({ user: null, tokens: null, activeProfileId: null, accessibleProfiles: [] }),
    }),
    {
      name: 'snooker.auth',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      // SECURITY: the access token (a JWT) is NEVER persisted — it lives only in
      // memory on the store. Persisting it to localStorage made it a long-lived
      // XSS-exfiltration target. We persist only the lightweight user summary
      // and the selected cabinet; accessibleProfiles is server-derived and
      // refetched on load. The user's presence is the "was authenticated" signal
      // that lets AuthGuard refresh-on-load from the httpOnly `snooker_refresh`
      // cookie. See docs/ui-guidelines.md "Auth UI".
      partialize: (state) => ({ user: state.user, activeProfileId: state.activeProfileId }),
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState>;
        // Drop any token persisted by an older version (v2 stored `tokens`).
        return {
          user: state.user ?? null,
          tokens: null,
          activeProfileId: state.activeProfileId ?? null,
          accessibleProfiles: [],
        };
      },
    },
  ),
);

/** Resolve the active cabinet's access for read-only / wellness gating. */
export function selectActiveProfile(state: {
  activeProfileId: string | null;
  accessibleProfiles: AccessibleProfile[];
}): AccessibleProfile | null {
  const { activeProfileId, accessibleProfiles } = state;
  if (activeProfileId) {
    const match = accessibleProfiles.find((p) => p.profileId === activeProfileId);
    if (match) return match;
  }
  // Fall back to the owned cabinet, else the first accessible one.
  return accessibleProfiles.find((p) => p.isOwner) ?? accessibleProfiles[0] ?? null;
}
