'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

/** The single source of truth for the persisted theme key. The no-FOUC inline
 *  script in `app/layout.tsx` reads the same key/shape before React hydrates,
 *  so keep them in sync. Default is dark (the product's primary identity). */
export const THEME_STORAGE_KEY = 'snooker.theme';
export const DEFAULT_THEME: Theme = 'dark';

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

/** Reflect the active theme onto `<html>` so the CSS variable overrides in
 *  globals.css take effect. We keep exactly one of `dark` / `light` present. */
function applyThemeClass(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // After the persisted value is read on the client, make sure the DOM
      // class matches it (the inline script set it pre-hydration, but this
      // covers the rare case where the two diverge).
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme);
      },
    },
  ),
);
