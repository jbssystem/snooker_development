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
      version: 2,
      partialize: (state) => ({ user: state.user, tokens: state.tokens }),
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState>;
        return {
          user: state.user ?? null,
          tokens: state.tokens
            ? {
                accessToken: state.tokens.accessToken,
                accessTokenExpiresAt: state.tokens.accessTokenExpiresAt,
              }
            : null,
        };
      },
    },
  ),
);
