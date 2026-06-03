# Table Renderer Spec

See TZ §11. This document captures the engineering contract for the
canvas component.

## Boundary

- Renderer consumes `TableLayout` from `@snooker/snooker-domain`.
- Renderer emits events; it never mutates state directly.
- No business logic (scoring, validation, drill rules) inside renderer.

## MVP renderer

- Library: `react-konva` on the web app's React 19 runtime.
- Location: `apps/web/src/components/table-renderer/`.
- Coordinate system: domain units are millimetres; renderer applies a
  single scale factor based on container width.
- Responsive: re-measure on `ResizeObserver`; preserve aspect ratio.
- `next.config.ts` transpiles `react-konva` / `konva` and marks Konva's
  optional Node `canvas` package as a webpack fallback (`false`) so the
  browser renderer builds in Next.js.
- `SnookerTableCanvas` is a browser-only dynamic wrapper; the Konva-backed
  implementation lives in `SnookerTableCanvasImpl` and is not evaluated in
  the server component graph.

## Delivered components

- `SnookerTableCanvas` — reusable renderer for table surface, cushions,
  pockets, baulk line/D, all ball colors, target zones, shot paths and
  annotations. `edit` mode supports dragging balls and exporting PNG via
  Konva `toDataURL`.
- `DrillLayoutEditor` — drill-template editor wrapper that manages layout
  state outside the renderer, adds balls/zones/shot lines, imports layout JSON
  through `TableLayoutSchema`, resets to a standard snooker layout and exports
  PNG.
- `TableLayoutPreview` — read-only wrapper for drill cards and training
  execution snapshots.
- `layouts.ts` — helper factory for empty and standard layouts plus default
  ball coordinates.

## Events

```ts
type RendererEvents = {
  onBallMove(ballId: string, next: { x: number; y: number }): void;
  onZoneChange(zoneId: string, next: TargetZone): void;
  onPathCreate(path: ShotPath): void;
  onLayoutSave(layout: TableLayout): void;
  onSelectionChange(selectedIds: string[]): void;
};
```

## Modes

- `view` — read-only (drill preview, layout snapshots).
- `edit` — drag-and-drop balls, add target zones, draw shot paths.
- `replay` — Phase 5 (PixiJS), timeline-driven.

## Editor presets and ball count

`DrillLayoutEditor` ships starting-point presets (`empty`, `standard`,
`colours`, `longPot`, `lineUp`) via `createPresetLayout`, and a reds stepper
(`withReds`, 0–15) that regenerates the red triangle while preserving colours,
cue ball, zones and paths. This lets a coach pick a common drill shape and dial
the number of balls instead of placing each ball by hand. Preset/red helpers
live in `apps/web/src/components/table-renderer/layouts.ts`.

## Editor interactions (edit mode)

`edit` mode is fully interactive and drives drill creation/editing:

- **Balls** drag to reposition (clamped to the table).
- **Shot lines**: select to reveal draggable endpoint handles; the arrow follows
  live. Optional `label`.
- **Target zones**: drag to move; selecting a circle/rectangle shows a resize
  handle (radius / bottom-right corner). Optional `label` shown on the zone.
- **Annotations**: free text placed on the table, draggable; text edited from the
  selected-element panel.
- Clicking an element selects it; clicking empty felt clears selection. The
  editor's selected-element panel offers delete + label/text editing. New
  zones/paths/annotations are auto-selected so they can be adjusted immediately.

Callbacks: `onBallMove`, `onZoneChange`, `onPathChange`, `onAnnotationChange`,
`onSelectionChange`. Drill templates can be edited after creation (the library
form doubles as an edit form, pre-filled including the table layout).

## Current limits

- Freehand multi-cushion path drawing and polygon-zone resizing remain future
  editor polish.
- The renderer is intentionally physics-free. Collision simulation, ghost ball,
  cushion projection and replay remain future overlays.

## Future swap to PixiJS

The adapter interface must stay stable so Phase 5 can swap implementation
without touching call sites:

```ts
interface TableRendererAdapter {
  mount(container: HTMLElement, layout: TableLayout, mode: 'view' | 'edit' | 'replay'): void;
  update(layout: TableLayout): void;
  destroy(): void;
  on<K extends keyof RendererEvents>(event: K, handler: RendererEvents[K]): () => void;
}
```
