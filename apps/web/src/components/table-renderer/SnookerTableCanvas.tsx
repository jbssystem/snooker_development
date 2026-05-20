'use client';

import dynamic from 'next/dynamic';
import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';
import type { Point, ShotPath, TableLayout, TargetZone } from '@snooker/snooker-domain';

export type TableInteractionMode = 'view' | 'edit' | 'replay';

export type SnookerTableCanvasHandle = {
  exportImage: () => string | null;
};

export type SnookerTableCanvasProps = {
  layout: TableLayout;
  mode?: TableInteractionMode;
  selectedIds?: string[];
  className?: string;
  onBallMove?: (ballId: string, next: Point) => void;
  onZoneChange?: (zoneId: string, next: TargetZone) => void;
  onPathCreate?: (path: ShotPath) => void;
  onLayoutSave?: (layout: TableLayout) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
};

type DynamicCanvasProps = SnookerTableCanvasProps & {
  forwardedRef?: ForwardedRef<SnookerTableCanvasHandle> | undefined;
};

const DynamicCanvas = dynamic<DynamicCanvasProps>(
  () => import('./SnookerTableCanvasImpl').then((module) => module.SnookerTableCanvasImpl),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-[2/1] w-full rounded-md border border-border-subtle bg-background-elevated"
        data-testid="snooker-table-canvas"
      />
    ),
  },
);

export const SnookerTableCanvas = forwardRef<SnookerTableCanvasHandle, SnookerTableCanvasProps>(
  function SnookerTableCanvas(props, ref) {
    return <DynamicCanvas {...props} forwardedRef={ref} />;
  },
);
