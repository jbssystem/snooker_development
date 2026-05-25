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

- `Header` — server component; logo, `MainNav`, `LocaleSwitcher` and
  `UserMenu`. Sticky, `bg-background-secondary/90` with backdrop blur.
  On mobile, primary navigation remains visible as a horizontal scroll rail.
- `MainNav` — client component; renders the primary app links and highlights
  the active route from the locale-aware pathname.
- `LocaleSwitcher` — client component; compact dropdown with flag options.
  It builds explicit locale-prefixed URLs after stripping any existing locale
  segments, so switching from a malformed path like `/uk/en/dashboard`
  normalizes back to `/en/dashboard`.
- `UserMenu` — client component; reads the persisted Zustand auth store,
  shows an initials avatar dropdown with profile and sign-out actions when
  authenticated, otherwise routes to `/login`.
- `AccordionSection` — client component for long secondary forms and detail
  sections. It uses a stable card surface, keyboard-accessible button header,
  optional default-open state and a short grid-row transition for smooth
  expand/collapse.
- Field-level hints — dense data-entry forms should show one short helper line
  for ranges, optional fields or downstream usage. Hints sit below the control
  in `text-text-disabled` and do not replace validation errors.
- Quiet transitions — view swaps, selected detail panels and compact feedback
  may use the global `ui-fade-in` class (160ms fade/translate). Keep motion
  functional and respect `prefers-reduced-motion`.
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
- Auth forms set `method="post"` so credentials are not serialized into the
  URL if a user submits before React hydration completes.
- All API error codes are mapped to translation keys under `errors.api.*`
  in the locale files. A missing translation falls back to the raw code so
  the UI never crashes on a new error.
- For MVP, only the short-lived access token and user summary are persisted to
  `localStorage` under `snooker.auth`. Refresh tokens live in the API-managed
  httpOnly `snooker_refresh` cookie. Phase 2 will add SSR-aware session reads.

## Profile UI

- `/profile` lives in the `(app)` route group and is rendered by
  `src/components/profile/ProfileClient.tsx`.
- The left column edits the player profile (identity, country, dominant hand,
  level and season goal). The right column creates equipment profiles and
  lists historical equipment entries.
- Equipment creation sits in a right-column accordion that is open by default
  for fast setup, while still allowing the user to collapse it when reviewing
  equipment history.
- Equipment creation is disabled until a player profile exists; the UI keeps
  that dependency visible with a warning message instead of silently failing.
- The page uses client-side auth from `useAuthStore` and TanStack Query keys
  `player-profile` and `equipment-profiles`.

## Drill Library UI

- `/drills` lives in the `(app)` route group and is rendered by
  `src/components/drills/DrillLibraryClient.tsx`.
- The main column lists visible drill templates. Each item shows category,
  difficulty, description, goal, success criteria and tags.
- The side panel creates a new user-owned template inside a default-open
  accordion with category, difficulty, visibility, text fields and a compact
  metric-row editor. Metrics are stored as `DrillMetricsSchema` (`version: 1`).
- Template fields include helper hints and placeholders so a coach can create
  a usable drill without guessing how much detail each field needs.
- The same form now embeds `DrillLayoutEditor`, which stores a visual
  `defaultTableLayout` with balls, target zones and shot paths. Drill cards
  show a compact `TableLayoutPreview`.

## Training UI

- `/training` lives in the `(app)` route group and is rendered by
  `src/components/training/TrainingSessionClient.tsx`.
- The left rail selects recent sessions, the center panel operates the active
  session, and the right panel starts a new session from a default-open
  accordion. This keeps the next data-entry action visible while preserving a
  stable tablet workflow for recording attempts.
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

## Analytics UI

- `/analytics` lives in the `(app)` route group and is rendered by
  `src/components/analytics/AnalyticsClient.tsx`.
- The page reuses the player dashboard API for MVP analytics: KPI cards,
  training volume chart, success trend chart, drill progress and match summary.
- The layout is mobile-first; charts stack before moving into two columns on
  wide screens.

## Match Log UI

- `/matches` lives in the `(app)` route group and is rendered by
  `src/components/matches/MatchLogClient.tsx`.
- The layout mirrors the training screen rhythm: match history on the left,
  selected match detail and frames in the center, and manual match creation on
  the right.
- Manual match creation and frame entry use default-open accordions so input is
  immediately available, while analysis and frame tables can still reclaim
  space when the user collapses the forms.
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
- The main area uses a compact segmented switch between a monthly calendar grid
  and list summaries. Calendar items stay clipped inside day cells to avoid
  overlapping neighboring days; the `+N more` control selects the full day and
  shows every item in the detail panel.
- The calendar surface is master-detail on wide screens: the grid/list stays on
  the left and the selected event/day/period detail remains in a sticky side
  panel. On narrow screens it stacks directly below the calendar content.
- List summaries are paged with compact "show more" controls so long histories
  stay scannable without hiding data permanently.
- The side column is a quick-entry tab panel for event, lifestyle day and
  supplement period forms. This avoids three closed accordions and keeps input
  one tap away.
- Calendar form fields include placeholders, visible ranges and neutral helper
  hints so data can be entered quickly without guessing formats.
- Wellness and supplement copy stays descriptive only. The UI records factors
  for later correlation, but does not make medical or causal claims.

## AI Reports UI

- `/ai` lives in the `(app)` route group and is rendered by
  `src/components/ai/AiReportsClient.tsx`.
- The layout uses a report history rail, a central report detail pane and a
  collapsed side form for generating a weekly summary. This keeps generated
  content scannable without hiding source metadata.
- The page uses client-side auth/profile checks from `useAuthStore` and TanStack
  Query key `ai-reports`; queued/running reports poll every five seconds until
  the worker completes or fails them.
- Each report shows period, status, provider/model, prompt version, source hash
  prefix and data-source counts before the markdown content.
- Wellness/supplement language remains neutral. The UI does not present AI
  content as medical advice and does not add supplement recommendations.

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
