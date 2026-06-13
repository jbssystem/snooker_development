'use client';

import { memo } from 'react';
import type { TableLayout } from '@snooker/snooker-domain';
import { SnookerTableCanvas } from './SnookerTableCanvas';

export const TableLayoutPreview = memo(function TableLayoutPreview({ layout }: { layout: TableLayout }) {
  return (
    <SnookerTableCanvas
      className="overflow-hidden rounded-md"
      layout={layout}
      mode="view"
    />
  );
});
