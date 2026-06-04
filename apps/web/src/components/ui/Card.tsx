import type { ElementType, ReactNode } from 'react';

/**
 * Elevated surface used across the app. `elevation` picks the depth plane
 * (1 = list cards, 2 = emphasised, 3 = floating). `interactive` adds a hover
 * lift + tactile press, `accent` highlights it with the brand colour + glow.
 */
export function Card({
  as,
  accent = false,
  interactive = false,
  elevation = 1,
  className = '',
  children,
}: {
  as?: ElementType;
  accent?: boolean;
  interactive?: boolean;
  elevation?: 1 | 2 | 3;
  className?: string;
  children: ReactNode;
}) {
  const Tag = as ?? 'div';
  const elev = elevation === 3 ? 'elev-3' : elevation === 2 ? 'elev-2' : '';
  const tone = accent ? 'border-brand-accent/45 shadow-glow' : '';
  const hover = interactive ? 'surface-hover cursor-pointer' : '';
  return (
    <Tag className={`surface rounded-xl ${elev} ${tone} ${hover} ${className}`}>{children}</Tag>
  );
}

/** Titled card with an optional eyebrow and header action. */
export function SectionCard({
  title,
  eyebrow,
  action,
  className = '',
  bodyClassName = '',
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-accent">{eyebrow}</p>
          )}
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h2>
        </div>
        {action}
      </div>
      <div className={`mt-4 ${bodyClassName}`}>{children}</div>
    </Card>
  );
}
