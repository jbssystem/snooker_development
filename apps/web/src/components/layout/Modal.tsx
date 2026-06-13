'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Lightweight accessible modal: backdrop click + Escape close, body scroll lock.
 * Bottom-sheet on mobile, centered card on >= sm.
 *
 * When `enableFullscreen` is set, a maximize toggle appears next to the close
 * button (>= sm only) that expands the dialog to fill the viewport — handy for
 * drill layouts where the user wants the table stretched as large as possible.
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
  className = 'sm:max-w-lg',
  enableFullscreen = false,
  fullscreenLabel = 'Fullscreen',
  exitFullscreenLabel = 'Exit fullscreen',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
  enableFullscreen?: boolean;
  fullscreenLabel?: string;
  exitFullscreenLabel?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Always reopen at the default (non-fullscreen) size.
  useEffect(() => {
    if (!open) setFullscreen(false);
  }, [open]);

  if (!open) return null;

  const sectionClass = fullscreen
    ? 'glass relative h-full w-full max-h-none max-w-none overflow-y-auto rounded-none p-5 ui-pop-in sm:p-6'
    : `glass relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl p-5 ui-pop-in sm:rounded-2xl ${className}`;

  return (
    <div
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${
        fullscreen ? 'p-0 sm:items-stretch sm:p-0' : 'p-0 sm:items-center sm:p-6'
      }`}
      onClick={onClose}
      role="dialog"
    >
      <section className={sectionClass} onClick={(event) => event.stopPropagation()}>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {enableFullscreen && (
            <button
              aria-label={fullscreen ? exitFullscreenLabel : fullscreenLabel}
              title={fullscreen ? exitFullscreenLabel : fullscreenLabel}
              className="press hidden h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-background-secondary text-text-secondary transition hover:border-brand-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active sm:inline-flex"
              onClick={() => setFullscreen((value) => !value)}
              type="button"
            >
              {fullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 3v3a3 3 0 0 1-3 3H3m18 0h-3a3 3 0 0 1-3-3V3M3 15h3a3 3 0 0 1 3 3v3m12-6h-3a3 3 0 0 0-3 3v3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4m12-6v4a2 2 0 0 1-2 2h-4" />
                </svg>
              )}
            </button>
          )}
          <button
            aria-label={closeLabel}
            className="press inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-background-secondary text-lg text-text-secondary transition hover:border-brand-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {title && <h2 className={`text-xl font-semibold text-text-primary ${enableFullscreen ? 'pr-24' : 'pr-12'}`}>{title}</h2>}
        <div className={title ? 'mt-4' : ''}>{children}</div>
      </section>
    </div>
  );
}
