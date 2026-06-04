'use client';

import { useEffect } from 'react';

type HotkeyHandler = (event: KeyboardEvent) => void;

/** True when focus is inside a text-entry control, so global keys don't fire. */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

/**
 * Register a single global keyboard shortcut. `combo` is a lowercase spec like
 * "k", "mod+k" (mod = Cmd on macOS / Ctrl elsewhere), "ctrl+z", "shift+/".
 * By default the handler is skipped while typing in a field unless
 * `allowInInput` is set (e.g. for Escape or mod-combos).
 */
export function useHotkey(
  combo: string,
  handler: HotkeyHandler,
  options: { allowInInput?: boolean; enabled?: boolean } = {},
) {
  const { allowInInput = false, enabled = true } = options;
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needMod = parts.includes('mod');
    const needCtrl = parts.includes('ctrl');
    const needShift = parts.includes('shift');
    const needAlt = parts.includes('alt');

    const onKey = (event: KeyboardEvent) => {
      if (!allowInInput && isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() !== key) return;
      const modPressed = event.metaKey || event.ctrlKey;
      if (needMod && !modPressed) return;
      if (needCtrl && !event.ctrlKey) return;
      if (needShift !== event.shiftKey) return;
      if (needAlt !== event.altKey) return;
      if (!needMod && !needCtrl && (event.metaKey || event.ctrlKey)) return;
      handler(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler, allowInInput, enabled]);
}
