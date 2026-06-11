'use client';

import { useEffect, useState } from 'react';
import { useToastStore, type Toast } from '@/lib/toast-store';

const AUTO_DISMISS_MS = 2400;
const EXIT_ANIM_MS = 200;

/**
 * Global toast container. Mounted once near the app root; renders the stack of
 * transient success/error messages in the top-right corner.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const enterTimer = setTimeout(() => setLeaving(true), AUTO_DISMISS_MS);
    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const exitTimer = setTimeout(() => dismiss(toast.id), EXIT_ANIM_MS);
    return () => clearTimeout(exitTimer);
  }, [leaving, dismiss, toast.id]);

  // Solid, saturated background so the toast clearly reads as success (green)
  // or error (red) at a glance — white text/icon on top for contrast. Colors
  // are set inline to avoid the unlayered `.glass` border overriding utilities.
  const background = toast.kind === 'success' ? '#12915a' : '#c0392b';

  return (
    <div
      role="status"
      onClick={() => setLeaving(true)}
      style={{ backgroundColor: background, color: '#ffffff' }}
      className={`elev-3 pointer-events-auto cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold shadow-lg ${
        leaving ? 'ui-toast-out' : 'ui-toast-in'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <ToastIcon kind={toast.kind} />
        <span className="leading-snug">{toast.message}</span>
      </div>
    </div>
  );
}

function ToastIcon({ kind }: { kind: Toast['kind'] }) {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-white"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      {kind === 'success' ? (
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.79 2.79 6.796-6.89a1 1 0 0 1 1.414-.006Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4a.9.9 0 0 1 .9.9v3.8a.9.9 0 1 1-1.8 0V6.9A.9.9 0 0 1 10 6Zm0 7.2a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}
