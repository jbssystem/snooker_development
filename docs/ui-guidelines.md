# UI Guidelines

Update on every new component, pattern or interaction rule.

## Principles

1. **Mobile-first, tablet-optimized, desktop-rich.** The drill execution flow
   is the highest-priority touch surface — a coach is using a tablet next to
   a snooker table. Large hit areas (≥44px), no fiddly inputs.
2. **Minimal typing during a session.** Capture attempts with single taps;
   defer notes until between drills.
3. **Dark by default.** Baize-green accents on near-black neutrals.
   Light theme is a Phase 2 toggle.
4. **i18n-first.** All strings via next-intl. No literals. See
   [docs/i18n.md](i18n.md).
5. **Dynamic but quiet.** Animations are short (≤200ms) and serve feedback,
   not decoration. The table renderer is the visual centerpiece.
6. **Offline-aware.** Surface an offline badge when the local mutation
   queue has unsynced items.

## Color palette (Tailwind tokens)

Full spec: [docs/brand.md](brand.md). Quick reference:

| Token | Use |
| --- | --- |
| `bg-background-primary` (#0E1116) | App background |
| `bg-background-secondary` (#161B22) | Card surface |
| `bg-background-elevated` (#1F2630) | Hover / nested blocks |
| `border-border-subtle` (#2A323D) | Default card border |
| `border-border-active` (#19A974) | Active / selected border |
| `text-text-primary` (#E9E6DF) | Primary text |
| `text-text-secondary` (#A8B0B8) | Secondary text |
| `text-text-disabled` (#6F7A86) | Disabled / metadata |
| `bg-brand-primary` (#0E6B4D) | Primary buttons, active nav, table outline |
| `bg-brand-accent` (#19A974) | Success, AI recommendations, progress |
| `text-brand-gold` (#C8A45D) | Personal bests, achievements, premium markers |
| `text-state-error` (#D65A5A) | Errors, injury risk |
| `text-state-warning` (#D89A3A) | Soft warnings, low-confidence AI |
| `text-state-info` (#4A90E2) | Info, neutral AI |
| `ball-*` | Snooker ball semantic colors only |

## Typography

- Sans: Inter (system fallback).
- Display sizes via Tailwind defaults; avoid custom `text-[..]` unless necessary.

## Component conventions

- Server components by default; `"use client"` only when needed.
- Each interactive widget exposes `data-testid` for Playwright.
- Forms: React Hook Form + Zod schema from `@snooker/shared`.
- Toasts/notifications: single library (TBD, picked at first toast usage).
- Charts: Recharts, dark-theme compatible.

## Layout primitives

To be added under `packages/ui/src/components` as we go:

- `Surface` — card container.
- `PageHeader` — title + actions + breadcrumbs.
- `Stat` — metric tile.
- `EmptyState` — call to action when no data.
- `LocaleSwitcher` — language toggle (ru/en/uk).
- `OfflineBadge` — sync status.

## Accessibility

- All interactive elements keyboard reachable.
- aria-label provided via `t()` keys, never hardcoded.
- Color is never the sole signal (e.g. ball colors paired with text labels in tables).
- Focus rings preserved (no `outline-none` without an alternative).

## Table renderer UX (MVP)

- Static layout viewer first, drag-and-drop editor next.
- Touch-friendly: ball hit area ≥ visual radius + 12px.
- Snap-to-spot for the 6 named spots.
- "Export as image" via Konva `toDataURL`.

## Drill execution screen targets (per TZ §4.5, §18.3)

Quick-action grid with: `+attempt`, `success`, `miss thick`, `miss thin`,
`lost position`, `safety good`, `safety bad`, `note`, `finish set`,
`finish drill`. Buttons stay reachable on a tablet in landscape.
