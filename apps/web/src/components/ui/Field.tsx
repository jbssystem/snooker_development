import type { ReactNode } from 'react';
import { InfoTooltip } from './InfoTooltip';

/**
 * Labelled form control. A `hint` is surfaced through a "?" tooltip next to the
 * label (not a permanent helper line), which keeps dense forms uncluttered.
 */
export function Field({
  children,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-text-secondary">
        {label}
        {hint && <InfoTooltip label={label} text={hint} />}
      </span>
      {children}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}
