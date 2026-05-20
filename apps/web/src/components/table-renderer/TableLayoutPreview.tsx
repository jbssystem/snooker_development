'use client';

import type { TableLayout } from '@snooker/snooker-domain';
import { SnookerTableCanvas } from './SnookerTableCanvas';

export function TableLayoutPreview({ layout }: { layout: TableLayout }) {
  return (
    <SnookerTableCanvas
      className="overflow-hidden rounded-md border border-border-subtle"
      layout={layout}
      mode="view"
    />
  );
}
