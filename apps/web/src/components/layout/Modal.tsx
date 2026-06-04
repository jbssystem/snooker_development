'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * Lightweight accessible modal: backdrop click + Escape close, body scroll lock.
 * Bottom-sheet on mobile, centered card on >= sm.
 */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
  className = 'sm:max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}) {
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

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <section
        className={`glass relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl p-5 ui-pop-in sm:rounded-2xl ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label={closeLabel}
          className="press absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-background-secondary text-lg text-text-secondary transition hover:border-brand-accent hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        {title && <h2 className="pr-12 text-xl font-semibold text-text-primary">{title}</h2>}
        <div className={title ? 'mt-4' : ''}>{children}</div>
      </section>
    </div>
  );
}
