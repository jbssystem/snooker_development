'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ForwardedRef } from 'react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import {
  BALL_DIAMETER_MM,
  POCKET_RADIUS_MM,
  type BallColor,
  type BallPosition,
  type Point,
  type ShotPath,
  type TableAnnotation,
  type TargetZone,
} from '@snooker/snooker-domain';
import { tableDimensions } from './layouts';
import type { SnookerTableCanvasHandle, SnookerTableCanvasProps } from './SnookerTableCanvas';

type Props = SnookerTableCanvasProps & {
  forwardedRef?: ForwardedRef<SnookerTableCanvasHandle> | undefined;
};

const PADDING_MM = 120;
const D_RADIUS_MM = 292;
const BALL_COLORS: Record<BallColor, { fill: string; stroke: string }> = {
  white: { fill: '#F5F1E6', stroke: '#D8D2C4' },
  red: { fill: '#C1121F', stroke: '#7D0E16' },
  yellow: { fill: '#F4C430', stroke: '#9D7E16' },
  green: { fill: '#2F8F53', stroke: '#1D5D36' },
  brown: { fill: '#6B4423', stroke: '#3F2815' },
  blue: { fill: '#1E5FB3', stroke: '#123968' },
  pink: { fill: '#F08FB0', stroke: '#9E4E6A' },
  black: { fill: '#1A1A1A', stroke: '#050505' },
};

export function SnookerTableCanvasImpl({
  layout,
  mode = 'view',
  selectedIds = [],
  className,
  onBallMove,
  onSelectionChange,
  forwardedRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const dimensions = tableDimensions(layout);
  const stageSize = useMemo(() => {
    const logicalWidth = dimensions.width + PADDING_MM * 2;
    const logicalHeight = dimensions.height + PADDING_MM * 2;
    const scale = containerWidth / logicalWidth;
    return { width: containerWidth, height: logicalHeight * scale, scale };
  }, [containerWidth, dimensions.height, dimensions.width]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextWidth = Math.max(280, Math.floor(entry.contentRect.width));
      setContainerWidth(nextWidth);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(forwardedRef, () => ({
    exportImage: () => stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null,
  }));

  const toCanvas = (point: Point): Point => ({
    x: (point.x + PADDING_MM) * stageSize.scale,
    y: (point.y + PADDING_MM) * stageSize.scale,
  });
  const toDomain = (point: Point): Point => ({
    x: clamp(point.x / stageSize.scale - PADDING_MM, 0, dimensions.width),
    y: clamp(point.y / stageSize.scale - PADDING_MM, 0, dimensions.height),
  });
  const tableX = PADDING_MM * stageSize.scale;
  const tableY = PADDING_MM * stageSize.scale;
  const tableWidth = dimensions.width * stageSize.scale;
  const tableHeight = dimensions.height * stageSize.scale;
  const selectedSet = new Set(selectedIds);

  return (
    <div ref={containerRef} className={className} data-testid="snooker-table-canvas">
      <Stage ref={stageRef} height={stageSize.height} width={stageSize.width}>
        <Layer>
          <Rect
            cornerRadius={18}
            fill="#1F2630"
            height={stageSize.height}
            shadowBlur={8}
            shadowColor="rgba(0,0,0,0.35)"
            width={stageSize.width}
            x={0}
            y={0}
          />
          <Rect
            cornerRadius={10}
            fill="#0E6B4D"
            height={tableHeight}
            stroke="#2A323D"
            strokeWidth={Math.max(2, 8 * stageSize.scale)}
            width={tableWidth}
            x={tableX}
            y={tableY}
          />
          <TableGuides dimensions={dimensions} scale={stageSize.scale} toCanvas={toCanvas} />
          <Pockets dimensions={dimensions} scale={stageSize.scale} toCanvas={toCanvas} />
          {layout.targetZones.map((zone) => (
            <TargetZoneShape
              key={zone.id}
              selected={selectedSet.has(zone.id)}
              toCanvas={toCanvas}
              zone={zone}
              onSelect={() => onSelectionChange?.([zone.id])}
            />
          ))}
          {layout.shotPaths.map((path) => (
            <ShotPathShape
              key={path.id}
              path={path}
              selected={selectedSet.has(path.id)}
              toCanvas={toCanvas}
              onSelect={() => onSelectionChange?.([path.id])}
            />
          ))}
          {layout.annotations.map((annotation) => (
            <AnnotationShape key={annotation.id} annotation={annotation} scale={stageSize.scale} toCanvas={toCanvas} />
          ))}
          {layout.balls.filter((ball) => ball.visible).map((ball) => (
            <BallShape
              key={ball.id}
              ball={ball}
              draggable={mode === 'edit'}
              selected={selectedSet.has(ball.id)}
              toCanvas={toCanvas}
              toDomain={toDomain}
              onDragEnd={(next) => onBallMove?.(ball.id, next)}
              onSelect={() => onSelectionChange?.([ball.id])}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function TableGuides({
  dimensions,
  scale,
  toCanvas,
}: {
  dimensions: { width: number; height: number };
  scale: number;
  toCanvas: (point: Point) => Point;
}) {
  const baulkX = dimensions.width * (736.6 / 3569);
  const centerY = dimensions.height / 2;
  const baulkTop = toCanvas({ x: baulkX, y: 0 });
  const baulkBottom = toCanvas({ x: baulkX, y: dimensions.height });
  const dPoints = semiCirclePoints({ x: baulkX, y: centerY }, D_RADIUS_MM * (dimensions.width / 3569), 90, 270)
    .flatMap((point) => toCanvasPair(toCanvas(point)));

  return (
    <Group listening={false}>
      <Line dash={[8 * scale, 8 * scale]} points={[baulkTop.x, baulkTop.y, baulkBottom.x, baulkBottom.y]} stroke="rgba(233,230,223,0.28)" strokeWidth={1.5} />
      <Line points={dPoints} stroke="rgba(233,230,223,0.28)" strokeWidth={1.5} />
    </Group>
  );
}

function Pockets({
  dimensions,
  scale,
  toCanvas,
}: {
  dimensions: { width: number; height: number };
  scale: number;
  toCanvas: (point: Point) => Point;
}) {
  const pockets = [
    { point: { x: 0, y: 0 }, radius: POCKET_RADIUS_MM.corner },
    { point: { x: dimensions.width, y: 0 }, radius: POCKET_RADIUS_MM.corner },
    { point: { x: 0, y: dimensions.height }, radius: POCKET_RADIUS_MM.corner },
    { point: { x: dimensions.width, y: dimensions.height }, radius: POCKET_RADIUS_MM.corner },
    { point: { x: dimensions.width / 2, y: 0 }, radius: POCKET_RADIUS_MM.middle },
    { point: { x: dimensions.width / 2, y: dimensions.height }, radius: POCKET_RADIUS_MM.middle },
  ];
  return (
    <Group listening={false}>
      {pockets.map((pocket, index) => {
        const point = toCanvas(pocket.point);
        return <Circle key={index} fill="#05070A" radius={pocket.radius * scale} x={point.x} y={point.y} />;
      })}
    </Group>
  );
}

function TargetZoneShape({
  selected,
  toCanvas,
  zone,
  onSelect,
}: {
  selected: boolean;
  toCanvas: (point: Point) => Point;
  zone: TargetZone;
  onSelect: () => void;
}) {
  const stroke = selected ? '#C8A45D' : '#19A974';
  if (zone.type === 'circle') {
    const point = toCanvas(zone);
    const edge = toCanvas({ x: zone.x + zone.radius, y: zone.y });
    return (
      <Circle
        fill="rgba(25,169,116,0.16)"
        radius={Math.abs(edge.x - point.x)}
        stroke={stroke}
        strokeWidth={selected ? 3 : 2}
        x={point.x}
        y={point.y}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }
  if (zone.type === 'rectangle') {
    const point = toCanvas(zone);
    const end = toCanvas({ x: zone.x + zone.width, y: zone.y + zone.height });
    return (
      <Rect
        fill="rgba(25,169,116,0.14)"
        height={end.y - point.y}
        stroke={stroke}
        strokeWidth={selected ? 3 : 2}
        width={end.x - point.x}
        x={point.x}
        y={point.y}
        onClick={onSelect}
        onTap={onSelect}
      />
    );
  }
  return (
    <Line
      closed
      fill="rgba(25,169,116,0.14)"
      points={zone.points.flatMap((point) => toCanvasPair(toCanvas(point)))}
      stroke={stroke}
      strokeWidth={selected ? 3 : 2}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

function ShotPathShape({
  path,
  selected,
  toCanvas,
  onSelect,
}: {
  path: ShotPath;
  selected: boolean;
  toCanvas: (point: Point) => Point;
  onSelect: () => void;
}) {
  const points = [path.from, ...(path.cushions ?? []), path.to].flatMap((point) => toCanvasPair(toCanvas(point)));
  return (
    <Arrow
      dash={[10, 8]}
      fill={selected ? '#F5F1E6' : '#C8A45D'}
      pointerLength={10}
      pointerWidth={8}
      points={points}
      stroke={selected ? '#F5F1E6' : '#C8A45D'}
      strokeWidth={selected ? 3 : 2}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

function AnnotationShape({ annotation, scale, toCanvas }: { annotation: TableAnnotation; scale: number; toCanvas: (point: Point) => Point }) {
  const point = toCanvas(annotation.at);
  return (
    <Text
      fill="#E9E6DF"
      fontSize={Math.max(11, 46 * scale)}
      text={annotation.text}
      x={point.x}
      y={point.y}
    />
  );
}

function BallShape({
  ball,
  draggable,
  selected,
  toCanvas,
  toDomain,
  onDragEnd,
  onSelect,
}: {
  ball: BallPosition;
  draggable: boolean;
  selected: boolean;
  toCanvas: (point: Point) => Point;
  toDomain: (point: Point) => Point;
  onDragEnd: (next: Point) => void;
  onSelect: () => void;
}) {
  const point = toCanvas(ball);
  const radiusPoint = toCanvas({ x: ball.x + BALL_DIAMETER_MM / 2, y: ball.y });
  const radius = Math.max(7, Math.abs(radiusPoint.x - point.x));
  const color = BALL_COLORS[ball.color];
  return (
    <Group
      draggable={draggable}
      x={point.x}
      y={point.y}
      dragBoundFunc={(next) => {
        const domain = toDomain(next);
        const bounded = toCanvas(domain);
        return { x: bounded.x, y: bounded.y };
      }}
      onClick={onSelect}
      onDragEnd={(event: KonvaEventObject<DragEvent>) => onDragEnd(toDomain({ x: event.target.x(), y: event.target.y() }))}
      onTap={onSelect}
    >
      {selected && <Circle fill="rgba(200,164,93,0.18)" radius={radius + 7} stroke="#C8A45D" strokeWidth={2} />}
      <Circle fill={color.fill} radius={radius} stroke={color.stroke} strokeWidth={ball.color === 'white' ? 2 : 1.5} />
      <Circle fill="rgba(255,255,255,0.28)" radius={radius * 0.28} x={-radius * 0.28} y={-radius * 0.28} />
    </Group>
  );
}

function semiCirclePoints(center: Point, radius: number, fromDegrees: number, toDegrees: number): Point[] {
  const points: Point[] = [];
  for (let angle = fromDegrees; angle <= toDegrees; angle += 8) {
    const radians = (angle * Math.PI) / 180;
    points.push({ x: center.x + Math.cos(radians) * radius, y: center.y + Math.sin(radians) * radius });
  }
  return points;
}

function toCanvasPair(point: Point): [number, number] {
  return [point.x, point.y];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
