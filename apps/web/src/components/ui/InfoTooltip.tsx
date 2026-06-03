'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Small "?" affordance next to a label. The tooltip is rendered in a portal with
 * fixed positioning so it is never clipped by a card/modal `overflow` or hidden
 * behind another stacking context. Hover (pointer), tap/Enter (touch + keyboard),
 * Escape or blur closes it.
 */
export function InfoTooltip({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const id = useId();

  const reposition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(Math.max(rect.left + rect.width / 2, 124), window.innerWidth - 124);
    setPos({ top: rect.top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, reposition]);

  return (
    <span className="inline-flex">
      <button
        aria-describedby={open ? id : undefined}
        aria-label={label ? `${label}: подсказка` : 'Подсказка'}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border-subtle text-[10px] font-semibold leading-none text-text-disabled transition hover:border-brand-accent hover:text-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-active"
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        ref={buttonRef}
        type="button"
      >
        ?
      </button>
      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              className="pointer-events-none fixed z-[100] w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-xs font-normal leading-relaxed text-text-secondary shadow-glow"
              style={{ top: pos.top - 8, left: pos.left }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
