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
    <label className="flex h-full flex-col gap-1.5 text-sm">
      <span className="flex items-start gap-1.5 text-text-secondary">
        {label}
        {hint && <InfoTooltip label={label} text={hint} />}
      </span>
      {/* mt-auto pushes the control to the bottom so inputs in a grid row line
          up even when some labels wrap to two lines. */}
      <div className="mt-auto">{children}</div>
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}
