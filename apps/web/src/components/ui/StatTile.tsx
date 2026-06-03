import type { ReactNode } from 'react';
import { Card } from './Card';

/** Compact KPI tile: label, large value, optional unit, icon and hint. */
export function StatTile({
  label,
  value,
  unit,
  icon,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  hint?: string;
  tone?: 'default' | 'accent' | 'gold';
}) {
  const iconTone =
    tone === 'gold'
      ? 'bg-brand-gold/15 text-brand-gold'
      : 'bg-brand-accent/15 text-brand-accent';
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-text-disabled">{label}</span>
        {icon && (
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
            <span className="h-[18px] w-[18px]">{icon}</span>
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-text-secondary">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-text-disabled">{hint}</p>}
    </Card>
  );
}
