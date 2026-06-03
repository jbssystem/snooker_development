'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  BallColor,
  Point,
  ShotPath,
  TableAnnotation,
  TableLayout,
  TargetZone,
} from '@snooker/snooker-domain';
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

export function DrillLayoutEditor({
  value,
  onChange,
  onImportFromPhoto,
  importing = false,
  importError = null,
}: {
  value: TableLayout;
  onChange: (layout: TableLayout) => void;
  /** When provided, shows the "import from photo" control; the parent owns the request and calls onChange with the result. */
  onImportFromPhoto?: (file: File) => void;
  importing?: boolean;
  importError?: string | null;
}) {
  const t = useTranslations('tableRenderer');
  const canvasRef = useRef<SnookerTableCanvasHandle | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ballColor, setBallColor] = useState<BallColor>('white');
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const selectedId = selectedIds[0];
  const selectedBall = useMemo(
    () => value.balls.find((ball) => ball.id === selectedId),
    [selectedId, value.balls],
  );
  const selected = useMemo(() => findSelected(value, selectedId), [selectedId, value]);
  const reds = redCount(value);
  const ballTotal = value.balls.length;

  return (
    <section className="grid gap-4 rounded-md border border-border-subtle bg-background-primary p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-text-primary">{t('editor.title')}</h3>
          {onImportFromPhoto && (
            <>
              <input
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) onImportFromPhoto(file);
                }}
                ref={photoInputRef}
                type="file"
              />
              <button
                aria-label={t('editor.photo.importFromPhoto')}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-accent/40 text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 disabled:opacity-60"
                disabled={importing}
                onClick={() => photoInputRef.current?.click()}
                title={t('editor.photo.hint')}
                type="button"
              >
                {importing ? <MiniSpinner /> : <CameraIcon />}
              </button>
            </>
          )}
        </div>
        <span className="text-xs text-text-disabled">{t('editor.ballCount', { count: ballTotal })}</span>
      </div>
      {onImportFromPhoto && importError && <span className="text-xs text-state-error">{importError}</span>}

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

      <div className="relative min-w-0">
        <SnookerTableCanvas
          ref={canvasRef}
          className="overflow-hidden rounded-md border border-border-subtle"
          layout={value}
          mode="edit"
          selectedIds={selectedIds}
          onAnnotationChange={(id, next) => updateAnnotation(value, onChange, id, next)}
          onBallMove={(ballId, next) => updateBall(value, onChange, ballId, next)}
          onPathChange={(id, next) => updatePath(value, onChange, id, next)}
          onSelectionChange={setSelectedIds}
          onZoneChange={(id, next) => updateZone(value, onChange, id, next)}
        />
        {importing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-md bg-background-primary/70 backdrop-blur-sm">
            <PhotoSpinner />
            <span className="animate-pulse text-sm font-medium text-brand-accent">{t('editor.photo.importing')}</span>
          </div>
        )}
      </div>

      {selected && (
        <div className="grid gap-2 rounded-md border border-brand-accent/50 bg-background-secondary p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-brand-accent">
              {t(`editor.selectedKinds.${selected.kind}`)}
            </span>
            <button
              className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary transition hover:border-state-error hover:text-state-error"
              onClick={() => { removeSelected(value, onChange, selectedIds); setSelectedIds([]); }}
              type="button"
            >
              {t('editor.delete')}
            </button>
          </div>
          {selected.kind === 'annotation' && (
            <input
              autoFocus
              className={inputClass}
              onChange={(event) => updateAnnotation(value, onChange, selected.id, { ...(selected.element as TableAnnotation), text: event.target.value })}
              placeholder={t('editor.annotationText')}
              value={(selected.element as TableAnnotation).text}
            />
          )}
          {(selected.kind === 'zone' || selected.kind === 'path') && (
            <input
              className={inputClass}
              onChange={(event) => updateLabel(value, onChange, selected, event.target.value)}
              placeholder={t('editor.label')}
              value={(selected.element as { label?: string }).label ?? ''}
            />
          )}
          {selected.kind !== 'ball' && <span className="text-xs text-text-disabled">{t('editor.dragHint')}</span>}
        </div>
      )}

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
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs uppercase tracking-wide text-text-disabled">{t('editor.toolsGroup')}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button className={secondaryButtonClass} onClick={() => addTargetZone(value, onChange, setSelectedIds)} type="button">
            {t('editor.addZone')}
          </button>
          <button className={secondaryButtonClass} onClick={() => addShotPath(value, onChange, selectedBall, setSelectedIds)} type="button">
            {t('editor.addPath')}
          </button>
          <button className={secondaryButtonClass} onClick={() => addAnnotation(value, onChange, setSelectedIds)} type="button">
            {t('editor.addAnnotation')}
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

function CameraIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1-1.6a1 1 0 0 1 .85-.4h7.3a1 1 0 0 1 .85.4L17.5 7h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Small inline spinner shown inside the camera button while a photo uploads.
function MiniSpinner() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-brand-accent/30 border-t-brand-accent"
    />
  );
}

// Full overlay spinner over the table while recognition runs: two counter-rotating
// arcs (accent + gold) around a glowing centre dot.
function PhotoSpinner() {
  return (
    <span aria-hidden className="relative inline-flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-l-brand-accent border-t-brand-accent [animation-duration:0.9s]" />
      <span className="absolute inset-2 animate-spin rounded-full border-[3px] border-transparent border-b-brand-gold border-r-brand-gold [animation-direction:reverse] [animation-duration:1.5s]" />
      <span className="h-3 w-3 rounded-full bg-brand-accent shadow-[0_0_14px_3px_rgba(25,169,116,0.65)]" />
    </span>
  );
}

type Selected =
  | { kind: 'ball'; id: string; element: TableLayout['balls'][number] }
  | { kind: 'zone'; id: string; element: TargetZone }
  | { kind: 'path'; id: string; element: ShotPath }
  | { kind: 'annotation'; id: string; element: TableAnnotation };

function findSelected(layout: TableLayout, id: string | undefined): Selected | null {
  if (!id) return null;
  const ball = layout.balls.find((item) => item.id === id);
  if (ball) return { kind: 'ball', id, element: ball };
  const zone = layout.targetZones.find((item) => item.id === id);
  if (zone) return { kind: 'zone', id, element: zone };
  const path = layout.shotPaths.find((item) => item.id === id);
  if (path) return { kind: 'path', id, element: path };
  const annotation = layout.annotations.find((item) => item.id === id);
  if (annotation) return { kind: 'annotation', id, element: annotation };
  return null;
}

function applyPreset(
  preset: DrillLayoutPreset,
  layout: TableLayout,
  onChange: (layout: TableLayout) => void,
  setSelectedIds: (ids: string[]) => void,
): void {
  onChange(createPresetLayout(preset, layout.id));
  setSelectedIds([]);
}

function updateZone(layout: TableLayout, onChange: (layout: TableLayout) => void, id: string, next: TargetZone): void {
  onChange({ ...layout, targetZones: layout.targetZones.map((zone) => (zone.id === id ? next : zone)) });
}

function updatePath(layout: TableLayout, onChange: (layout: TableLayout) => void, id: string, next: ShotPath): void {
  onChange({ ...layout, shotPaths: layout.shotPaths.map((path) => (path.id === id ? next : path)) });
}

function updateAnnotation(layout: TableLayout, onChange: (layout: TableLayout) => void, id: string, next: TableAnnotation): void {
  onChange({ ...layout, annotations: layout.annotations.map((annotation) => (annotation.id === id ? next : annotation)) });
}

function updateLabel(layout: TableLayout, onChange: (layout: TableLayout) => void, selected: Selected, label: string): void {
  const value = label.trim() ? label : undefined;
  if (selected.kind === 'zone') updateZone(layout, onChange, selected.id, { ...selected.element, label: value });
  if (selected.kind === 'path') updatePath(layout, onChange, selected.id, { ...selected.element, label: value });
}

function addAnnotation(layout: TableLayout, onChange: (layout: TableLayout) => void, setSelectedIds: (ids: string[]) => void): void {
  const dimensions = tableDimensions(layout);
  const id = `note-${Date.now()}`;
  onChange({
    ...layout,
    annotations: [...layout.annotations, { id, text: 'Текст', at: { x: dimensions.width * 0.3, y: dimensions.height * 0.25 } }],
  });
  setSelectedIds([id]);
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

function addTargetZone(layout: TableLayout, onChange: (layout: TableLayout) => void, setSelectedIds: (ids: string[]) => void): void {
  const dimensions = tableDimensions(layout);
  const id = `zone-${Date.now()}`;
  onChange({
    ...layout,
    targetZones: [
      ...layout.targetZones,
      { id, type: 'circle', x: dimensions.width * 0.72, y: dimensions.height / 2, radius: dimensions.height * 0.12 },
    ],
  });
  setSelectedIds([id]);
}

function addShotPath(
  layout: TableLayout,
  onChange: (layout: TableLayout) => void,
  selectedBall: { x: number; y: number } | undefined,
  setSelectedIds: (ids: string[]) => void,
): void {
  const dimensions = tableDimensions(layout);
  const cueBall = layout.balls.find((ball) => ball.color === 'white');
  const from = cueBall ? { x: cueBall.x, y: cueBall.y } : { x: dimensions.width * 0.18, y: dimensions.height * 0.65 };
  const to = selectedBall ? { x: selectedBall.x, y: selectedBall.y } : { x: dimensions.width * 0.7, y: dimensions.height / 2 };
  const id = `path-${Date.now()}`;
  onChange({ ...layout, shotPaths: [...layout.shotPaths, { id, from, to }] });
  setSelectedIds([id]);
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
