'use client';

import { useId, useState } from 'react';

/**
 * Small "?" affordance next to a label. Shows a tooltip on hover (pointer) and
 * toggles on click/Enter (touch + keyboard). Escape or blur closes it.
 */
export function InfoTooltip({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex">
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
        type="button"
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-52 -translate-x-1/2 rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-xs font-normal leading-relaxed text-text-secondary shadow-glow"
        >
          {text}
        </span>
      )}
    </span>
  );
}
