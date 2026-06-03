'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { ChevronDown } from '@/components/layout/ChevronDown';

export function AccordionSection({
  children,
  className = '',
  compact = false,
  contentClassName = '',
  defaultOpen = false,
  subtitle,
  testId,
  title,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  contentClassName?: string;
  defaultOpen?: boolean;
  subtitle?: string;
  testId?: string;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      className={`surface overflow-hidden rounded-xl ${className}`}
      data-testid={testId}
    >
      <button
        aria-expanded={open}
        aria-controls={contentId}
        className={`flex w-full items-center justify-between gap-4 text-left transition hover:bg-background-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-border-active ${
          compact ? 'min-h-11 px-4 py-3' : 'min-h-14 px-5 py-4'
        }`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="min-w-0">
          <span className={`block font-semibold text-text-primary ${compact ? 'text-base' : 'text-lg'}`}>{title}</span>
          {subtitle && <span className="mt-1 block text-sm text-text-secondary">{subtitle}</span>}
        </span>
        <ChevronDown open={open} />
      </button>
      <div
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        id={contentId}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className={`border-t border-border-subtle ${compact ? 'px-4 py-4' : 'px-5 py-5'} ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}