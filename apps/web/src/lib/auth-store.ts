'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthMe, Tokens } from '@snooker/shared';

/**
 * Auth session is persisted in localStorage for MVP.
 * Phase 2 will move refresh tokens to httpOnly cookies and add SSR-aware
 * session reading. Until then, all auth-gated UI is client-rendered.
 */
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
    },
  ),
);
