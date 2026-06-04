import type { ReactNode } from 'react';

/** Consistent page title block: optional eyebrow, title, subtitle and actions. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  breadcrumbs,
  className = '',
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** Optional breadcrumb trail rendered above the title (see Breadcrumbs). */
  breadcrumbs?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-6 border-b border-border-subtle/60 pb-5 ${className}`}>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span aria-hidden className="mt-1 hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-accent to-brand-gold sm:block" />
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-accent">{eyebrow}</p>
            )}
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
