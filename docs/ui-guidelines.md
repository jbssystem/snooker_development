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

Delivered so far (under `apps/web/src/components/layout/`):

- `Header` — server component; logo + primary navigation + `LocaleSwitcher`
  + `UserMenu`. Sticky, `bg-background-secondary/80` with backdrop blur.
- `LocaleSwitcher` — client component; native `<select>` of `ru` / `en` / `uk`,
  preserves current pathname via `next-intl/navigation` (`localePrefix: 'always'`).
- `UserMenu` — client component; reads the persisted Zustand auth store,
  shows the display name and a sign-out button when authenticated, otherwise
  routes to `/login`.
- `(app)/layout.tsx` route group — wraps authenticated pages with `Header`
  and a centered max-w-7xl container.
- `(auth)/layout.tsx` route group — minimal centered card layout used by
  `login` and `register` pages.
- `app/layout.tsx` is the required Next.js root document layout (`html`,
  `body`, metadata, viewport). `[locale]/layout.tsx` is nested and owns only
  `NextIntlClientProvider` + `QueryProvider`.

Still to add under `packages/ui/src/components` as the design crystallises:

- `Surface` — card container.
- `PageHeader` — title + actions + breadcrumbs.
- `Stat` — metric tile.
- `EmptyState` — call to action when no data.
- `OfflineBadge` — sync status.

## Auth UI

- Auth pages live in the `(auth)` route group; no header / nav is rendered,
  to keep the funnel focused.
- `AuthForm` (`src/components/auth/AuthForm.tsx`) is a single client
  component reused by `/login` and `/register` via a `mode` prop. It uses
  React Hook Form + the `api` client and stores the returned session in the
  Zustand `useAuthStore`.
- All API error codes are mapped to translation keys under `errors.api.*`
  in the locale files. A missing translation falls back to the raw code so
  the UI never crashes on a new error.
- For MVP, tokens are persisted to `localStorage` under the key
  `snooker.auth`. Phase 2 will move refresh tokens into httpOnly cookies
  and add SSR-aware session reads.

## Profile UI

- `/profile` lives in the `(app)` route group and is rendered by
  `src/components/profile/ProfileClient.tsx`.
- The left column edits the player profile (identity, country, dominant hand,
  level and season goal). The right column creates equipment profiles and
  lists historical equipment entries.
- Equipment creation is disabled until a player profile exists; the UI keeps
  that dependency visible with a warning message instead of silently failing.
- The page uses client-side auth from `useAuthStore` and TanStack Query keys
  `player-profile` and `equipment-profiles`.

## Drill Library UI

- `/drills` lives in the `(app)` route group and is rendered by
  `src/components/drills/DrillLibraryClient.tsx`.
- The main column lists visible drill templates. Each item shows category,
  difficulty, description, goal, success criteria and tags.
- The side panel creates a new user-owned template with category, difficulty,
  visibility, text fields and a compact metric-row editor. Metrics are stored
  as `DrillMetricsSchema` (`version: 1`).
- The initial default table layout is an empty full-size layout; PH-1-006 will
  replace this with the visual `SnookerTableCanvas` editor.

## Providers

`src/providers/QueryProvider.tsx` wraps locale routes under
`NextIntlClientProvider` in `[locale]/layout.tsx` and gives every page access
to a per-request TanStack Query client (`staleTime: 30s`, `retry: 1`).

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
