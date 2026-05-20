# Table Renderer Spec

See TZ §11. This document captures the engineering contract for the
canvas component.

## Boundary

- Renderer consumes `TableLayout` from `@snooker/snooker-domain`.
- Renderer emits events; it never mutates state directly.
- No business logic (scoring, validation, drill rules) inside renderer.

## MVP renderer

- Library: `react-konva`.
- Location: `apps/web/src/components/table-renderer/` (added in the
  table-renderer task).
- Coordinate system: domain units are millimetres; renderer applies a
  single scale factor based on container width.
- Responsive: re-measure on `ResizeObserver`; preserve aspect ratio.

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
