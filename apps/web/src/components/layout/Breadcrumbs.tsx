import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

export type Crumb = { label: string; href?: string };

/** Compact breadcrumb trail. The last item renders as the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-disabled">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li className="flex items-center gap-1.5" key={`${item.label}-${index}`}>
              {item.href && !last ? (
                <Link
                  className="rounded transition hover:text-text-secondary focus-ring"
                  href={item.href as never}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={last ? 'text-text-secondary' : undefined} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <Chevron />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Chevron(): ReactNode {
  return (
    <svg aria-hidden className="h-3 w-3 text-text-disabled/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
