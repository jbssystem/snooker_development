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
- Shared UI primitives live in `apps/web/src/components/ui/` and are the
  building blocks for the redesign — use them instead of ad-hoc card markup:
  - `Card` / `SectionCard` — elevated `.surface` (rounded-xl, inner top
    highlight + soft drop shadow); `interactive` adds a hover lift, `accent`
    adds the brand glow. `SectionCard` adds an eyebrow/title/action header.
  - `PageHeader` — eyebrow + title + subtitle + actions, one per page.
  - `StatTile` — KPI tile with label, large value, optional unit + tinted icon.
    KPI grids are `grid-cols-2` on mobile (never one giant card per stat).
  - `EmptyState` — centered dashed surface with icon, copy and CTAs.
  - `icons.tsx` — line icon set (currentColor, 1.8 stroke) for nav and tiles.
- `MobileTabBar` (`components/layout/MobileTabBar.tsx`) — fixed bottom tab bar
  shown on `< lg` (phone + tablet portrait) with the four primary destinations
  and a "More" sheet (`Modal`) for the rest. The top `MainNav` is hidden below
  `lg`. The app container adds `pb-24 lg:pb-8` so content clears the bar.
- Ambient depth: `globals.css` paints a fixed brand radial glow behind content;
  surfaces use the `.surface` / `.surface-hover` classes for consistent
  elevation.
- `Field` + `InfoTooltip` — labelled control where the helper text is surfaced
  through a "?" tooltip next to the label (hover on pointer, tap/Enter on touch,
  Escape/blur closes) instead of a permanent helper line under every input. Use
  `Field` from `components/ui` for dense forms to keep them uncluttered. The
  matches page is the reference implementation; roll out to other forms next.
- `Modal` — client component for occasional forms/dialogs (bottom-sheet on
  mobile, centered card on >= sm). Backdrop click + Escape close, body scroll
  lock. Used for the training "new session" form so it does not occupy a
  permanent column.
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
- List / detail / form pages (training, matches, AI) use a three-column
  `xl:grid-cols-[list_detail_form]` layout. The detail/working section carries
  `order-first xl:order-none` so on narrow screens the active workspace appears
  before the long left-hand list instead of below it; the form accordion stays
  last. Keep these primary forms `defaultOpen` for cross-page consistency.
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
- Two-column layout: a left rail of recent sessions (with a `+ New session`
  button) and a single working column. Starting a session opens a `Modal`
  (`components/layout/Modal.tsx`) instead of a permanent third column, which
  removed the prior overlap into the center column and de-cluttered the page.
- The working column leads with the active drill: drill name, a three-up tally
  (attempts / successes / success rate) and large outcome buttons, so logging
  attempts is the visual focus. Session meta (intensity/fatigue/focus) is shown
  as compact pills; the attempt history (and table snapshot) lives in a
  collapsed accordion. On mobile the working column comes first
  (`order-first lg:order-none`).
- Starting a session captures title, type, goal, intensity, pre-session
  fatigue, focus and mood. Finishing captures post-session fatigue.
- A visible drill template can be added to the active session. The execution
  panel records single-tap outcomes: success, partial, miss or skipped (colour
  coded by outcome); each tap appends a numbered attempt and updates counters,
  and the last attempt can be undone.
- The active session header is followed by a live-read panel that derives a
  conservative next action from fatigue/focus, current drill success rate and
  the last ten attempts. It is phrased as coaching context rather than a hard
  prescription.
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
- `CoachInsightPanel` renders the dashboard coach-radar: client-side computed
  insight cards for momentum, focus drill, load rhythm and match transfer. Each
  card shows the observed metric, confidence, period-safe wording and a direct
  next-screen action.
- Empty state keeps two practical exits visible: profile setup and starting a
  training session. The API returns empty aggregates when a profile does not
  exist yet, so the page can stay stable immediately after registration.

## Analytics UI

- `/analytics` lives in the `(app)` route group and is rendered by
  `src/components/analytics/AnalyticsClient.tsx`.
- The page reuses the player dashboard API for MVP analytics: KPI cards,
  coach-radar insights, training volume chart, success trend chart, drill
  progress and match summary.
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
- **Match vs sparring**: both are the same entity tagged by `matchType`. The
  left sidebar offers a primary "Match" and a secondary "Sparring" create
  button; the modal carries a segmented Match/Sparring toggle (relabelling the
  opponent field to "sparring partner"). A `MatchTypeBadge`
  (`components/matches/ball-visuals.tsx`) tags each list card (top-right) and the
  detail header. New records pre-fill the date with the current time.
- **Real names, not generic labels**: frame forms, the edit modal, the frame
  table's winner column and the scorer all show the player's profile name and
  the opponent name instead of "player score / opponent score".
- **Two-mode frame entry** in the add-frame accordion:
  - *Quick* — the original final-score form.
  - *Detailed* — `FrameScorer` (`components/matches/FrameScorer.tsx`), a live
    ball-by-ball scorer driven by the `@snooker/snooker-domain` engine via
    `useReducer`. Ball palette enables only legal balls, with Foul (4–7), Free
    ball, Safety, Miss, Undo and Re-rack; a per-player ball-sequence map groups
    pots into breaks. Saving persists the `scoreEvents` log.
  - Saved frames with a log expose a "Map" action that reconstructs the
    sequence via `replay` in a modal.
- A lightweight `matchProgress` helper parses the free-text `format`
  ("best of 7", "race to 3", "до 4") into a frames-to-win target and shows a
  progress/frame-ball/match-ball/decider badge next to the score. No new data.
- **Live mode** (`isLive`): a toggle in the create modal. When on, the summary-
  stats section and manual frame score are hidden (they derive from frames), and
  in the detail view quick frame entry auto-times each frame's duration (gap
  since the previous logged frame) and hides the manual duration input.
- Both frame-entry modes stay mounted (the inactive one is `hidden`, not
  unmounted) so the live scorer keeps its in-progress break when the coach flips
  between Quick and Detailed.
- The detailed scorer's turn-pass control is a prominent "end turn" button
  (accent-tinted) rather than a plain "miss"; the ball-sequence map wraps balls
  onto new lines for long breaks.
- Match stats and opponent history use a compact `StatStrip` (tiny uppercase
  labels over tabular values with hairline dividers) plus a coloured
  `ResultChip`, replacing the bordered stat-tile grid.

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
- A readiness lens appears above the calendar surface. It summarizes the last
  seven lifestyle entries into a neutral readiness score, confidence by data
  completeness and one next logging/training action, without supplement or
  medical recommendations.

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
- External-analysis reports render visual context before the markdown: match
  score bars, break-building bars, average-points trend and a compact frame map
  using the selected matches stored in report `sourceData`.
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
