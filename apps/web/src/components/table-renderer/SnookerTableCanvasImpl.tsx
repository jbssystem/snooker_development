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
const HANDLE = '#C8A45D';
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
  onZoneChange,
  onPathChange,
  onAnnotationChange,
  onSelectionChange,
  forwardedRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const dimensions = tableDimensions(layout);
  const editable = mode === 'edit';
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
  // Render the canvas at a higher internal resolution so the heavily downscaled
  // table (full-size in mm → a few hundred px) stays crisp.
  const pixelRatio = typeof window !== 'undefined' ? Math.min(3, Math.max(2, window.devicePixelRatio || 1)) : 2;

  return (
    <div ref={containerRef} className={className} data-testid="snooker-table-canvas">
      <Stage
        ref={stageRef}
        height={stageSize.height}
        width={stageSize.width}
        onMouseDown={(event) => {
          if (editable && event.target === event.target.getStage()) onSelectionChange?.([]);
        }}
      >
        <Layer pixelRatio={pixelRatio}>
          <Rect cornerRadius={18} fill="#1F2630" height={stageSize.height} shadowBlur={8} shadowColor="rgba(0,0,0,0.35)" width={stageSize.width} x={0} y={0} />
          <Rect cornerRadius={10} fill="#0E6B4D" height={tableHeight} stroke="#2A323D" strokeWidth={Math.max(2, 8 * stageSize.scale)} width={tableWidth} x={tableX} y={tableY} />
          <TableGuides dimensions={dimensions} scale={stageSize.scale} toCanvas={toCanvas} />
          <Pockets dimensions={dimensions} scale={stageSize.scale} toCanvas={toCanvas} />

          {layout.targetZones.map((zone) => (
            <TargetZoneShape
              key={zone.id}
              editable={editable}
              scale={stageSize.scale}
              selected={selectedSet.has(zone.id)}
              toCanvas={toCanvas}
              toDomain={toDomain}
              zone={zone}
              onChange={(next) => onZoneChange?.(zone.id, next)}
              onSelect={() => onSelectionChange?.([zone.id])}
            />
          ))}

          {layout.shotPaths.map((path) => (
            <ShotPathShape
              key={path.id}
              scale={stageSize.scale}
              selected={selectedSet.has(path.id)}
              toCanvas={toCanvas}
              path={path}
              onSelect={() => onSelectionChange?.([path.id])}
            />
          ))}

          {layout.annotations.map((annotation) => (
            <AnnotationShape
              key={annotation.id}
              annotation={annotation}
              editable={editable}
              scale={stageSize.scale}
              selected={selectedSet.has(annotation.id)}
              toCanvas={toCanvas}
              toDomain={toDomain}
              onChange={(next) => onAnnotationChange?.(annotation.id, next)}
              onSelect={() => onSelectionChange?.([annotation.id])}
            />
          ))}

          {layout.balls.filter((ball) => ball.visible).map((ball) => (
            <BallShape
              key={ball.id}
              ball={ball}
              draggable={editable}
              selected={selectedSet.has(ball.id)}
              toCanvas={toCanvas}
              toDomain={toDomain}
              onDragEnd={(next) => onBallMove?.(ball.id, next)}
              onSelect={() => onSelectionChange?.([ball.id])}
            />
          ))}

          {editable && (
            <EditHandles
              layout={layout}
              selectedId={selectedIds[0]}
              toCanvas={toCanvas}
              toDomain={toDomain}
              onPathChange={onPathChange}
              onZoneChange={onZoneChange}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

/** Grab handles for the selected element, drawn on top of every shape so they
 * are always reachable (like the selection handles on a Miro board). */
function EditHandles({
  layout,
  selectedId,
  toCanvas,
  toDomain,
  onPathChange,
  onZoneChange,
}: {
  layout: SnookerTableCanvasProps['layout'];
  selectedId: string | undefined;
  toCanvas: (point: Point) => Point;
  toDomain: (point: Point) => Point;
  onPathChange?: ((id: string, next: ShotPath) => void) | undefined;
  onZoneChange?: ((id: string, next: TargetZone) => void) | undefined;
}) {
  if (!selectedId) return null;

  const path = layout.shotPaths.find((item) => item.id === selectedId);
  if (path) {
    const from = toCanvas(path.from);
    const to = toCanvas(path.to);
    const cushions = path.cushions ?? [];
    return (
      <>
        <DragHandle x={from.x} y={from.y} onDragMove={(canvas) => onPathChange?.(path.id, { ...path, from: toDomain(canvas) })} />
        {cushions.map((cushion, index) => {
          const point = toCanvas(cushion);
          return (
            <DragHandle
              key={index}
              variant="resize"
              x={point.x}
              y={point.y}
              onDragMove={(canvas) =>
                onPathChange?.(path.id, {
                  ...path,
                  cushions: cushions.map((item, itemIndex) => (itemIndex === index ? toDomain(canvas) : item)),
                })
              }
            />
          );
        })}
        <DragHandle x={to.x} y={to.y} onDragMove={(canvas) => onPathChange?.(path.id, { ...path, to: toDomain(canvas) })} />
      </>
    );
  }

  const zone = layout.targetZones.find((item) => item.id === selectedId);
  if (zone && zone.type === 'circle') {
    const center = toCanvas(zone);
    const edge = toCanvas({ x: zone.x + zone.radius, y: zone.y });
    return (
      <>
        <DragHandle x={center.x} y={center.y} onDragMove={(canvas) => onZoneChange?.(zone.id, { ...zone, ...toDomain(canvas) })} />
        <DragHandle
          variant="resize"
          x={edge.x}
          y={center.y}
          onDragMove={(canvas) => onZoneChange?.(zone.id, { ...zone, radius: Math.max(40, Math.abs(toDomain(canvas).x - zone.x)) })}
        />
      </>
    );
  }
  if (zone && zone.type === 'rectangle') {
    const center = toCanvas({ x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 });
    const corner = toCanvas({ x: zone.x + zone.width, y: zone.y + zone.height });
    return (
      <>
        <DragHandle
          x={center.x}
          y={center.y}
          onDragMove={(canvas) => {
            const next = toDomain(canvas);
            onZoneChange?.(zone.id, { ...zone, x: next.x - zone.width / 2, y: next.y - zone.height / 2 });
          }}
        />
        <DragHandle
          variant="resize"
          x={corner.x}
          y={corner.y}
          onDragMove={(canvas) => {
            const next = toDomain(canvas);
            onZoneChange?.(zone.id, { ...zone, width: Math.max(40, next.x - zone.x), height: Math.max(40, next.y - zone.y) });
          }}
        />
      </>
    );
  }

  return null;
}

function TableGuides({ dimensions, scale, toCanvas }: { dimensions: { width: number; height: number }; scale: number; toCanvas: (point: Point) => Point }) {
  const baulkX = dimensions.width * (736.6 / 3569);
  const centerY = dimensions.height / 2;
  const baulkTop = toCanvas({ x: baulkX, y: 0 });
  const baulkBottom = toCanvas({ x: baulkX, y: dimensions.height });
  const dPoints = semiCirclePoints({ x: baulkX, y: centerY }, D_RADIUS_MM * (dimensions.width / 3569), 90, 270).flatMap((point) => toCanvasPair(toCanvas(point)));

  return (
    <Group listening={false}>
      <Line dash={[8 * scale, 8 * scale]} points={[baulkTop.x, baulkTop.y, baulkBottom.x, baulkBottom.y]} stroke="rgba(233,230,223,0.28)" strokeWidth={1.5} />
      <Line points={dPoints} stroke="rgba(233,230,223,0.28)" strokeWidth={1.5} />
    </Group>
  );
}

function Pockets({ dimensions, scale, toCanvas }: { dimensions: { width: number; height: number }; scale: number; toCanvas: (point: Point) => Point }) {
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

function DragHandle({
  x,
  y,
  variant = 'move',
  onDragMove,
}: {
  x: number;
  y: number;
  variant?: 'move' | 'resize';
  onDragMove: (canvas: Point) => void;
}) {
  return (
    <Group
      draggable
      x={x}
      y={y}
      onDragMove={(event) => onDragMove({ x: event.target.x(), y: event.target.y() })}
      onMouseEnter={(event) => {
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = variant === 'resize' ? 'nwse-resize' : 'grab';
      }}
      onMouseLeave={(event) => {
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
    >
      {/* Large invisible hit area so the handle is easy to grab. */}
      <Circle radius={18} fill="#000" opacity={0.001} />
      <Circle fill="#F5F1E6" radius={9} shadowBlur={5} shadowColor="rgba(0,0,0,0.55)" stroke={HANDLE} strokeWidth={3} />
    </Group>
  );
}

function TargetZoneShape({
  editable,
  scale,
  selected,
  toCanvas,
  toDomain,
  zone,
  onChange,
  onSelect,
}: {
  editable: boolean;
  scale: number;
  selected: boolean;
  toCanvas: (point: Point) => Point;
  toDomain: (point: Point) => Point;
  zone: TargetZone;
  onChange: (next: TargetZone) => void;
  onSelect: () => void;
}) {
  const stroke = selected ? HANDLE : '#19A974';
  const strokeWidth = selected ? 3 : 2;

  if (zone.type === 'circle') {
    const center = toCanvas(zone);
    const edge = toCanvas({ x: zone.x + zone.radius, y: zone.y });
    const radius = Math.abs(edge.x - center.x);
    return (
      <>
        <Circle
          draggable={editable}
          fill="rgba(25,169,116,0.16)"
          radius={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          x={center.x}
          y={center.y}
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={(event) => {
            const next = toDomain({ x: event.target.x(), y: event.target.y() });
            onChange({ ...zone, x: next.x, y: next.y });
          }}
        />
        {zone.label && <ZoneLabel scale={scale} text={zone.label} x={center.x} y={center.y} />}
      </>
    );
  }

  if (zone.type === 'rectangle') {
    const topLeft = toCanvas(zone);
    const end = toCanvas({ x: zone.x + zone.width, y: zone.y + zone.height });
    return (
      <>
        <Rect
          draggable={editable}
          fill="rgba(25,169,116,0.14)"
          height={end.y - topLeft.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          width={end.x - topLeft.x}
          x={topLeft.x}
          y={topLeft.y}
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={(event) => {
            const next = toDomain({ x: event.target.x(), y: event.target.y() });
            onChange({ ...zone, x: next.x, y: next.y });
          }}
        />
        {zone.label && <ZoneLabel scale={scale} text={zone.label} x={(topLeft.x + end.x) / 2} y={(topLeft.y + end.y) / 2} />}
      </>
    );
  }

  return (
    <Line
      closed
      draggable={editable}
      fill="rgba(25,169,116,0.14)"
      points={zone.points.flatMap((point) => toCanvasPair(toCanvas(point)))}
      stroke={stroke}
      strokeWidth={strokeWidth}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

function ZoneLabel({ text, x, y, scale }: { text: string; x: number; y: number; scale: number }) {
  return (
    <Text align="center" fill="#E9E6DF" fontSize={Math.max(11, 40 * scale)} listening={false} offsetX={60} text={text} width={120} x={x} y={y - Math.max(7, 22 * scale)} />
  );
}

function ShotPathShape({
  scale,
  selected,
  toCanvas,
  path,
  onSelect,
}: {
  scale: number;
  selected: boolean;
  toCanvas: (point: Point) => Point;
  path: ShotPath;
  onSelect: () => void;
}) {
  const from = toCanvas(path.from);
  const to = toCanvas(path.to);
  const points = [path.from, ...(path.cushions ?? []), path.to].flatMap((point) => toCanvasPair(toCanvas(point)));
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return (
    <>
      <Arrow
        dash={path.style === 'solid' ? [] : [10, 8]}
        fill={selected ? '#F5F1E6' : HANDLE}
        hitStrokeWidth={20}
        pointerLength={10}
        pointerWidth={8}
        points={points}
        stroke={selected ? '#F5F1E6' : HANDLE}
        strokeWidth={selected ? 3 : 2}
        onClick={onSelect}
        onTap={onSelect}
      />
      {path.label && <Text fill="#E9E6DF" fontSize={Math.max(10, 34 * scale)} listening={false} text={path.label} x={mid.x + 6} y={mid.y - 18} />}
    </>
  );
}

function AnnotationShape({
  annotation,
  editable,
  scale,
  selected,
  toCanvas,
  toDomain,
  onChange,
  onSelect,
}: {
  annotation: TableAnnotation;
  editable: boolean;
  scale: number;
  selected: boolean;
  toCanvas: (point: Point) => Point;
  toDomain: (point: Point) => Point;
  onChange: (next: TableAnnotation) => void;
  onSelect: () => void;
}) {
  const point = toCanvas(annotation.at);
  const fontSize = Math.max(12, 46 * scale);
  return (
    <Group
      draggable={editable}
      x={point.x}
      y={point.y}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onChange({ ...annotation, at: toDomain({ x: event.target.x(), y: event.target.y() }) })}
    >
      {selected && (
        <Rect cornerRadius={4} fill="rgba(200,164,93,0.14)" height={fontSize + 8} stroke={HANDLE} strokeWidth={1} width={annotation.text.length * fontSize * 0.62 + 12} x={-6} y={-4} />
      )}
      <Text fill="#E9E6DF" fontSize={fontSize} fontStyle="600" text={annotation.text} />
    </Group>
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
      {selected && <Circle fill="rgba(200,164,93,0.18)" radius={radius + 7} stroke={HANDLE} strokeWidth={2} />}
      {/* Soft cast shadow on the cloth gives the ball a sense of volume. */}
      <Circle
        fill={color.fill}
        radius={radius}
        shadowBlur={radius * 0.7}
        shadowColor="#000000"
        shadowOffsetY={radius * 0.32}
        shadowOpacity={0.4}
        stroke={color.stroke}
        strokeWidth={ball.color === 'white' ? 2 : 1.5}
      />
      {/* Dark lower rim + glossy top highlight read as a lit sphere. */}
      <Circle
        fillRadialGradientColorStops={[0, 'rgba(255,255,255,0.55)', 0.5, 'rgba(255,255,255,0)']}
        fillRadialGradientEndRadius={radius * 0.9}
        fillRadialGradientStartPoint={{ x: -radius * 0.3, y: -radius * 0.3 }}
        fillRadialGradientStartRadius={0}
        radius={radius}
      />
      <Circle fill="rgba(255,255,255,0.55)" radius={radius * 0.22} x={-radius * 0.3} y={-radius * 0.32} />
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
