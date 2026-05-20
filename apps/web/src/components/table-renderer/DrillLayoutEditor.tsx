'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BallColor, Point, TableLayout } from '@snooker/snooker-domain';
import { TableLayoutSchema } from '@snooker/shared';
import { createStandardTableLayout, defaultBallPoint, tableDimensions } from './layouts';
import { SnookerTableCanvas, type SnookerTableCanvasHandle } from './SnookerTableCanvas';

const BALL_COLORS: BallColor[] = ['white', 'red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];

export function DrillLayoutEditor({ value, onChange }: { value: TableLayout; onChange: (layout: TableLayout) => void }) {
  const t = useTranslations('tableRenderer');
  const canvasRef = useRef<SnookerTableCanvasHandle | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ballColor, setBallColor] = useState<BallColor>('white');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const selectedId = selectedIds[0];
  const selectedBall = useMemo(
    () => value.balls.find((ball) => ball.id === selectedId),
    [selectedId, value.balls],
  );

  return (
    <section className="grid gap-4 rounded-md border border-border-subtle bg-background-primary p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium text-text-primary">{t('editor.title')}</h3>
        <button className={secondaryButtonClass} onClick={() => onChange(createStandardTableLayout(value.id))} type="button">
          {t('editor.resetStandard')}
        </button>
      </div>

      <SnookerTableCanvas
        ref={canvasRef}
        className="overflow-hidden rounded-md border border-border-subtle"
        layout={value}
        mode="edit"
        selectedIds={selectedIds}
        onBallMove={(ballId, next) => updateBall(value, onChange, ballId, next)}
        onSelectionChange={setSelectedIds}
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <span>{t('editor.ballColor')}</span>
          <select className={inputClass} onChange={(event) => setBallColor(event.target.value as BallColor)} value={ballColor}>
            {BALL_COLORS.map((color) => (
              <option key={color} value={color}>{t(`balls.${color}`)}</option>
            ))}
          </select>
        </label>
        <button className={secondaryButtonClass} onClick={() => addBall(value, onChange, ballColor)} type="button">
          {t('editor.addBall')}
        </button>
        <button className={secondaryButtonClass} disabled={!selectedBall} onClick={() => removeSelected(value, onChange, selectedIds)} type="button">
          {t('editor.removeSelected')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button className={secondaryButtonClass} onClick={() => addTargetZone(value, onChange)} type="button">
          {t('editor.addZone')}
        </button>
        <button className={secondaryButtonClass} onClick={() => addShotPath(value, onChange, selectedBall)} type="button">
          {t('editor.addPath')}
        </button>
        <button className={secondaryButtonClass} onClick={() => exportImage(canvasRef.current)} type="button">
          {t('editor.exportImage')}
        </button>
        <button className={secondaryButtonClass} onClick={() => setJsonDraft(JSON.stringify(value, null, 2))} type="button">
          {t('editor.copyJson')}
        </button>
      </div>

      <details className="rounded-md border border-border-subtle p-3 text-sm text-text-secondary">
        <summary className="cursor-pointer text-text-primary">{t('editor.json')}</summary>
        <textarea
          className={`${inputClass} mt-3 min-h-28 font-mono text-xs`}
          onChange={(event) => setJsonDraft(event.target.value)}
          value={jsonDraft}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={secondaryButtonClass} onClick={() => loadJson(jsonDraft, onChange, setJsonError)} type="button">
            {t('editor.loadJson')}
          </button>
          {jsonError && <span className="text-state-error">{t('editor.jsonError')}</span>}
        </div>
      </details>
    </section>
  );
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-secondary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const secondaryButtonClass =
  'rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-50';

function updateBall(
  layout: TableLayout,
  onChange: (layout: TableLayout) => void,
  ballId: string,
  next: Point,
): void {
  onChange({
    ...layout,
    balls: layout.balls.map((ball) => (ball.id === ballId ? { ...ball, x: next.x, y: next.y } : ball)),
  });
}

function addBall(layout: TableLayout, onChange: (layout: TableLayout) => void, color: BallColor): void {
  const point = defaultBallPoint(color, layout);
  const ball = {
    id: `${color}-${Date.now()}`,
    color,
    x: point.x,
    y: point.y,
    visible: true,
  };
  onChange({ ...layout, balls: [...layout.balls, ball] });
}

function removeSelected(layout: TableLayout, onChange: (layout: TableLayout) => void, selectedIds: string[]): void {
  const selected = new Set(selectedIds);
  onChange({
    ...layout,
    balls: layout.balls.filter((ball) => !selected.has(ball.id)),
    targetZones: layout.targetZones.filter((zone) => !selected.has(zone.id)),
    shotPaths: layout.shotPaths.filter((path) => !selected.has(path.id)),
    annotations: layout.annotations.filter((annotation) => !selected.has(annotation.id)),
  });
}

function addTargetZone(layout: TableLayout, onChange: (layout: TableLayout) => void): void {
  const dimensions = tableDimensions(layout);
  onChange({
    ...layout,
    targetZones: [
      ...layout.targetZones,
      {
        id: `zone-${Date.now()}`,
        type: 'circle',
        x: dimensions.width * 0.72,
        y: dimensions.height / 2,
        radius: dimensions.height * 0.12,
      },
    ],
  });
}

function addShotPath(layout: TableLayout, onChange: (layout: TableLayout) => void, selectedBall: { x: number; y: number } | undefined): void {
  const dimensions = tableDimensions(layout);
  const cueBall = layout.balls.find((ball) => ball.color === 'white');
  const from = cueBall ? { x: cueBall.x, y: cueBall.y } : { x: dimensions.width * 0.18, y: dimensions.height * 0.65 };
  const to = selectedBall ? { x: selectedBall.x, y: selectedBall.y } : { x: dimensions.width * 0.7, y: dimensions.height / 2 };
  onChange({
    ...layout,
    shotPaths: [...layout.shotPaths, { id: `path-${Date.now()}`, from, to }],
  });
}

function exportImage(canvas: SnookerTableCanvasHandle | null): void {
  const dataUrl = canvas?.exportImage();
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `snooker-layout-${Date.now()}.png`;
  link.click();
}

function loadJson(
  value: string,
  onChange: (layout: TableLayout) => void,
  setJsonError: (error: string | null) => void,
): void {
  try {
    const parsed = TableLayoutSchema.parse(JSON.parse(value)) as TableLayout;
    onChange(parsed);
    setJsonError(null);
  } catch {
    setJsonError('invalid');
  }
}
