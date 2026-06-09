import type { ReactNode } from 'react';
import { Card } from './Card';

/** Compact KPI tile: label, large value, optional unit, icon, hint and trend. */
export function StatTile({
  label,
  value,
  unit,
  icon,
  hint,
  trend,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  hint?: string;
  /** Optional delta vs. a previous period. `direction` colours the chip. */
  trend?: { label: string; direction: 'up' | 'down' | 'flat' };
  tone?: 'default' | 'accent' | 'gold';
}) {
  const iconTone =
    tone === 'gold'
      ? 'from-brand-gold/35 to-brand-gold/5 text-brand-gold ring-brand-gold/25'
      : 'from-brand-accent/35 to-brand-primary/5 text-brand-accent ring-brand-accent/25';
  const trendTone =
    trend?.direction === 'up'
      ? 'bg-state-success/12 text-state-success'
      : trend?.direction === 'down'
        ? 'bg-state-error/12 text-state-error'
        : 'bg-background-elevated text-text-secondary';
  const trendArrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
  return (
    <Card className={`stat-tile accent-top group p-4 sm:p-5 ${tone === 'gold' ? 'stat-tile-gold' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-text-disabled transition-colors duration-200 group-hover:text-text-secondary">{label}</span>
        {icon && (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-elev-1 ring-1 transition-transform duration-200 group-hover:scale-110 ${iconTone}`}>
            <span className="h-5 w-5">{icon}</span>
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-text-primary transition-colors duration-200 group-hover:text-white sm:text-4xl">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-text-secondary">{unit}</span>}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${trendTone}`}>
            <span aria-hidden>{trendArrow}</span>
            {trend.label}
          </span>
        )}
        {hint && <p className="text-xs text-text-disabled">{hint}</p>}
      </div>
    </Card>
  );
}
