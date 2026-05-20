// Pure domain types — no React, no canvas, no rendering library.
// Renderers (react-konva today, PixiJS later) consume these via adapters.

export type BallColor =
  | 'white'
  | 'red'
  | 'yellow'
  | 'green'
  | 'brown'
  | 'blue'
  | 'pink'
  | 'black';

export type TableSize = 'full-size' | 'club' | 'custom';

export interface Point {
  x: number;
  y: number;
}

export interface BallPosition {
  id: string;
  color: BallColor;
  x: number;
  y: number;
  visible: boolean;
}

export type TargetZone =
  | { id: string; type: 'circle'; x: number; y: number; radius: number; label?: string | undefined }
  | {
      id: string;
      type: 'rectangle';
      x: number;
      y: number;
      width: number;
      height: number;
      label?: string | undefined;
    }
  | { id: string; type: 'polygon'; points: Point[]; label?: string | undefined };

export interface ShotPath {
  id: string;
  from: Point;
  to: Point;
  cushions?: Point[] | undefined;
  label?: string | undefined;
}

export interface TableAnnotation {
  id: string;
  text: string;
  at: Point;
}

export interface TableLayout {
  id: string;
  tableSize: TableSize;
  balls: BallPosition[];
  targetZones: TargetZone[];
  shotPaths: ShotPath[];
  annotations: TableAnnotation[];
}
