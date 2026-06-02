'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BallColor, Point, TableLayout } from '@snooker/snooker-domain';
import { TableLayoutSchema } from '@snooker/shared';
import {
  DRILL_LAYOUT_PRESETS,
  MAX_REDS,
  type DrillLayoutPreset,
  createPresetLayout,
  defaultBallPoint,
  redCount,
  tableDimensions,
  withReds,
} from './layouts';
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
  const reds = redCount(value);
  const ballTotal = value.balls.length;

  return (
    <section className="grid gap-4 rounded-md border border-border-subtle bg-background-primary p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium text-text-primary">{t('editor.title')}</h3>
        <span className="text-xs text-text-disabled">{t('editor.ballCount', { count: ballTotal })}</span>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs uppercase tracking-wide text-text-disabled">{t('editor.presets.title')}</legend>
        <div className="flex flex-wrap gap-2">
          {DRILL_LAYOUT_PRESETS.map((preset) => (
            <button
              key={preset}
              className={chipButtonClass}
              onClick={() => applyPreset(preset, value, onChange, setSelectedIds)}
              type="button"
            >
              {t(`editor.presets.${preset}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <SnookerTableCanvas
        ref={canvasRef}
        className="overflow-hidden rounded-md border border-border-subtle"
        layout={value}
        mode="edit"
        selectedIds={selectedIds}
        onBallMove={(ballId, next) => updateBall(value, onChange, ballId, next)}
        onSelectionChange={setSelectedIds}
      />

      <fieldset className="grid gap-2 rounded-md border border-border-subtle p-3">
        <legend className="px-1 text-xs uppercase tracking-wide text-text-disabled">{t('editor.reds.title')}</legend>
        <div className="flex items-center gap-3">
          <button
            aria-label={t('editor.reds.decrease')}
            className={stepperButtonClass}
            disabled={reds <= 0}
            onClick={() => onChange(withReds(value, reds - 1))}
            type="button"
          >
            −
          </button>
          <input
            aria-label={t('editor.reds.title')}
            className="w-16 rounded-md border border-border-subtle bg-background-secondary px-2 py-2 text-center text-text-primary focus:border-border-active focus:outline-none"
            max={MAX_REDS}
            min={0}
            onChange={(event) => onChange(withReds(value, Number.parseInt(event.target.value, 10) || 0))}
            type="number"
            value={reds}
          />
          <button
            aria-label={t('editor.reds.increase')}
            className={stepperButtonClass}
            disabled={reds >= MAX_REDS}
            onClick={() => onChange(withReds(value, reds + 1))}
            type="button"
          >
            +
          </button>
          <span className="text-xs text-text-disabled">{t('editor.reds.hint')}</span>
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs uppercase tracking-wide text-text-disabled">{t('editor.ballsGroup')}</legend>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
            <span>{t('editor.ballColor')}</span>
            <select className={inputClass} onChange={(event) => setBallColor(event.target.value as BallColor)} value={ballColor}>
              {BALL_COLORS.map((color) => (
                <option key={color} value={color}>{t(`balls.${color}`)}</option>
              ))}
            </select>
          </label>
          <button className={`${secondaryButtonClass} self-end`} onClick={() => addBall(value, onChange, ballColor)} type="button">
            {t('editor.addBall')}
          </button>
          <button className={`${secondaryButtonClass} self-end`} disabled={!selectedBall} onClick={() => removeSelected(value, onChange, selectedIds)} type="button">
            {t('editor.removeSelected')}
          </button>
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs uppercase tracking-wide text-text-disabled">{t('editor.toolsGroup')}</legend>
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
      </fieldset>

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
const chipButtonClass =
  'rounded-full border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary';
const stepperButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle text-lg text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-40';

function applyPreset(
  preset: DrillLayoutPreset,
  layout: TableLayout,
  onChange: (layout: TableLayout) => void,
  setSelectedIds: (ids: string[]) => void,
): void {
  onChange(createPresetLayout(preset, layout.id));
  setSelectedIds([]);
}

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
