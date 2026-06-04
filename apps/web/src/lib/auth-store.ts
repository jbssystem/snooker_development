'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthMe, Tokens } from '@snooker/shared';

type AuthState = {
  user: AuthMe | null;
  tokens: Tokens | null;
  setSession: (session: { user: AuthMe; tokens: Tokens }) => void;
  setTokens: (tokens: Tokens) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setSession: ({ user, tokens }) => set({ user, tokens }),
      setTokens: (tokens) => set({ tokens }),
      clear: () => set({ user: null, tokens: null }),
    }),
    {
      name: 'snooker.auth',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      // SECURITY: the access token (a JWT) is NEVER persisted — it lives only in
      // memory on the store. Persisting it to localStorage made it a long-lived
      // XSS-exfiltration target. We persist only the lightweight user summary;
      // its presence is the "was authenticated" signal that lets AuthGuard
      // refresh-on-load from the httpOnly `snooker_refresh` cookie. See
      // docs/ui-guidelines.md "Auth UI".
      partialize: (state) => ({ user: state.user }),
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState>;
        // Drop any token persisted by an older version (v2 stored `tokens`).
        return { user: state.user ?? null, tokens: null };
      },
    },
  ),
);
