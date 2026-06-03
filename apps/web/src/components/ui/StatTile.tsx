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
      ? 'from-brand-gold/35 to-brand-gold/5 text-brand-gold ring-brand-gold/25'
      : 'from-brand-accent/35 to-brand-primary/5 text-brand-accent ring-brand-accent/25';
  return (
    <Card className="accent-top p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-text-disabled">{label}</span>
        {icon && (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${iconTone}`}>
            <span className="h-5 w-5">{icon}</span>
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-text-secondary">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-text-disabled">{hint}</p>}
    </Card>
  );
}
