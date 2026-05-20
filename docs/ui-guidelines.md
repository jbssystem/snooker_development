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

| Token                               | Use                                           |
| ----------------------------------- | --------------------------------------------- |
| `bg-background-primary` (#0E1116)   | App background                                |
| `bg-background-secondary` (#161B22) | Card surface                                  |
| `bg-background-elevated` (#1F2630)  | Hover / nested blocks                         |
| `border-border-subtle` (#2A323D)    | Default card border                           |
| `border-border-active` (#19A974)    | Active / selected border                      |
| `text-text-primary` (#E9E6DF)       | Primary text                                  |
| `text-text-secondary` (#A8B0B8)     | Secondary text                                |
| `text-text-disabled` (#6F7A86)      | Disabled / metadata                           |
| `bg-brand-primary` (#0E6B4D)        | Primary buttons, active nav, table outline    |
| `bg-brand-accent` (#19A974)         | Success, AI recommendations, progress         |
| `text-brand-gold` (#C8A45D)         | Personal bests, achievements, premium markers |
| `text-state-error` (#D65A5A)        | Errors, injury risk                           |
| `text-state-warning` (#D89A3A)      | Soft warnings, low-confidence AI              |
| `text-state-info` (#4A90E2)         | Info, neutral AI                              |
| `ball-*`                            | Snooker ball semantic colors only             |

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
  - `UserMenu`. Sticky, `bg-background-secondary/80` with backdrop blur.
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
- The same form now embeds `DrillLayoutEditor`, which stores a visual
  `defaultTableLayout` with balls, target zones and shot paths. Drill cards
  show a compact `TableLayoutPreview`.

## Training UI

- `/training` lives in the `(app)` route group and is rendered by
  `src/components/training/TrainingSessionClient.tsx`.
- The left rail selects recent sessions, the center panel operates the active
  session, and the right panel starts a new session. This keeps the tablet
  workflow stable while a coach records attempts.
- Starting a session captures title, type, goal, intensity, pre-session
  fatigue, focus and mood. Finishing captures post-session fatigue.
- A visible drill template can be added to the active session. The execution
  panel records single-tap outcomes: success, partial, miss or skipped; each
  tap appends a numbered attempt and updates counters.
- Drill execution detail shows the saved `tableLayoutSnapshot` through
  `TableLayoutPreview`, so the coach sees the exact scheme that was copied
  from the template when the execution was added.

## Dashboard UI

- `/dashboard` lives in the `(app)` route group and is rendered by
  `src/components/dashboard/DashboardClient.tsx`.
- The page uses client-side auth from `useAuthStore` and TanStack Query key
  `player-dashboard`, calling `GET /players/me/dashboard`.
- The first dashboard slice is operational rather than decorative: KPI tiles
  for sessions, minutes, attempts and success rate; Recharts panels for
  weekly training volume and attempt success trend; match-performance summary;
  drill progress rows; and recent sessions.
- Empty state keeps two practical exits visible: profile setup and starting a
  training session. The API returns empty aggregates when a profile does not
  exist yet, so the page can stay stable immediately after registration.

## Match Log UI

- `/matches` lives in the `(app)` route group and is rendered by
  `src/components/matches/MatchLogClient.tsx`.
- The layout mirrors the training screen rhythm: match history on the left,
  selected match detail and frames in the center, and manual match creation on
  the right.
- Match creation captures opponent, date, tournament context, venue, frame
  score, breaks, safety/long-pot percentages, error counts, links and notes.
- The selected match detail shows score/result, key stat tiles, a frame table,
  an add-frame form, and an opponent-history summary derived from the loaded
  match list.
- Adding a frame invalidates `matches` and `player-dashboard` query keys so
  match history and downstream analytics refresh together.

## Calendar Factors UI

- `/calendar` lives in the `(app)` route group and is rendered by
  `src/components/calendar/CalendarFactorsClient.tsx`.
- The page uses the same client-side auth/profile pattern as training and
  matches, with TanStack Query keys `calendar-events`, `lifestyle-factors`
  and `supplement-events` scoped by token.
- The main area shows a current-player event timeline, recent daily lifestyle
  records and supplement periods. The side column keeps three compact forms:
  add calendar event, save daily lifestyle factor and add supplement period.
- Wellness and supplement copy stays descriptive only. The UI records factors
  for later correlation, but does not make medical or causal claims.

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

- Renderer components live under `apps/web/src/components/table-renderer/`.
- `SnookerTableCanvas` is renderer-only: it receives `TableLayout`, emits
  events and does not own drill/training business state.
- `view` mode is used by drill cards and training execution snapshots.
- `edit` mode is used by `DrillLayoutEditor` in the drill-template form.
- Touch-friendly: ball hit area ≥ visual radius + 12px.
- Standard layout reset places colors on their spots and reds in a triangle.
- Export as image uses Konva `toDataURL` from the editor wrapper.
- Layout JSON import validates through `TableLayoutSchema` before replacing
  editor state.

## Drill execution screen targets (per TZ §4.5, §18.3)

Quick-action grid with: `+attempt`, `success`, `miss thick`, `miss thin`,
`lost position`, `safety good`, `safety bad`, `note`, `finish set`,
`finish drill`. Buttons stay reachable on a tablet in landscape.

PH-1-005 ships the first compact outcome grid (`success`, `partial`, `miss`,
`skipped`). Detailed miss taxonomy and note shortcuts remain planned for the
expanded drill execution screen.
