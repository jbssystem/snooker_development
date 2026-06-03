import type { ReactNode } from 'react';
import Image from 'next/image';

/** Centered empty / call-to-action state inside a dashed surface. */
export function EmptyState({
  title,
  description,
  icon,
  illustration = false,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Show the branded empty-state illustration instead of the small icon badge. */
  illustration?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid place-items-center rounded-xl border border-dashed border-border-subtle bg-background-secondary/60 p-8 text-center sm:p-10 ${className}`}
    >
      <div className="max-w-sm">
        {illustration ? (
          <Image
            src="/illustrations/empty-state.png"
            alt=""
            aria-hidden
            width={176}
            height={176}
            className="mx-auto mb-5 h-40 w-40 select-none opacity-95"
          />
        ) : (
          icon && (
            <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent/12 text-brand-accent">
              <span className="h-6 w-6">{icon}</span>
            </span>
          )
        )}
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>}
        {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
