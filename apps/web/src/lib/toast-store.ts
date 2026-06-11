'use client';

import { create } from 'zustand';

export type ToastKind = 'success' | 'error';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastState = {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
};

function newId(): string {
  // crypto.randomUUID is available in all our target browsers; fall back just in
  // case it is missing (e.g. non-secure context during local testing).
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) =>
    set((state) => ({ toasts: [...state.toasts, { id: newId(), kind, message }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Convenience hook for firing toasts from components. The underlying store is
 * also reachable outside React via `useToastStore.getState().push(...)`.
 */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  };
}
