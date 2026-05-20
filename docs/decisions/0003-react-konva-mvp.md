# ADR-0003 — react-konva for MVP table renderer, PixiJS later

Date: 2026-05-20
Status: Accepted

## Context

TZ §11 calls for a snooker table renderer with future support for
animation, replay, and possibly physics. MVP needs a static viewer plus
a drill layout editor.

## Decision

- MVP: `react-konva` for the 2D table renderer and drill editor.
- Phase 5: introduce `PixiJS` for animation/replay behind the same
  `TableRendererAdapter` interface.
- The pure domain (`@snooker/snooker-domain`) never imports a rendering
  library; UI adapters live in `apps/web` (and later `packages/ui`).

## Consequences

- Lower complexity and easier agent tasks for MVP.
- A swap to PixiJS is local to the adapter layer.
- Bundle includes Konva (~150KB gz) on pages that mount the renderer
  only — code-split via dynamic import.
