# Development Log

Living journal of project phases, decisions and deliverables.
Newest entries on top. Every meaningful change to the project plan or any
phase boundary is recorded here. Code-level changes go into commit messages,
not this file.

Format:

- **Phase / Milestone** — date range, status.
- **Goal** — what success looks like.
- **Delivered** — what actually shipped.
- **Decisions** — choices that affect later phases (link ADRs where applicable).
- **Open items** — what is still pending.

---

## Phase 1 — MVP (in progress)

**Status:** 🟡 In progress (started 2026-05-20).

### Match list filter/paging + fullscreen mobile scorer (2026-06-03)

**Delivered:**

- Match Log sidebar gained an opponent search box and client-side paging
  (`MATCH_PAGE_SIZE = 8`, prev/next + `from–to of total` status). Filter resets
  to page 1; `activeMatch` still resolves against the full list so the open
  match stays selected even when filtered out of view.
- Detailed `FrameScorer` gained a "Fullscreen" toggle: a single scorer instance
  re-parented purely via `className` (`fixed inset-0 z-50`) so the in-progress
  break survives expand/collapse. The overlay shows only the live entry —
  ideal for ball-by-ball scoring on mobile. Verified at 390px.
- i18n keys `scorer.expand`/`collapse`, `filter.*`, `pagination.*` in ru/en/uk.

**Decisions:** filtering/paging is client-side (the list is already fetched in
full); no API change. Fullscreen keeps the same React node to preserve scorer
state rather than conditionally mounting in two places.

### Sparring + live frame scorer with snooker rules (2026-06-03)

**Delivered:**

- New pure scoring engine `@snooker/snooker-domain` `scoring/` (immutable,
  replayable): reds-then-colours phases, min-4 fouls (penalty = max(4, ball)),
  free ball, break/high-break tracking, undo via replay, per-side ball-sequence
  map. First Vitest tests in the repo (13 cases incl. a 147).
- `matchType` (`match`/`sparring`) added across Prisma (enum + index), shared
  Zod schemas and the API; one entity, tagged. Per-frame `scoreEvents` JSON log
  added; when present the API recomputes frame totals/winner from it via the
  engine. Migration `20260603130000_add_match_type_and_score_events`.
- Match Log UI: Match/Sparring create + segmented toggle, auto-filled current
  date, `MatchTypeBadge` on list cards and detail header, real player/opponent
  names throughout the frame forms/table, and a two-mode add-frame flow — quick
  final-score form or the detailed live `FrameScorer` (ball palette, fouls,
  free ball, safety/miss, undo, re-rack, per-player ball map). Saved frames with
  a log get a "Map" reconstruction modal. Lightweight `format`-aware progress
  badge (best-of/race-to → frame-ball/match-ball/decider).
- i18n keys added to ru/en/uk.

**Decisions:** sparring is a flag on `Match`, not a separate entity; the
ball-by-ball event log is the source of truth and the server re-derives totals
from it via the domain engine (defence against client/server drift).

### Frame edit/delete, aligned inputs, interactive drill editor (2026-06-03)

**Delivered:**

- Match form inputs align on one line even with two-line labels (`Field` control
  is bottom-aligned).
- Frame editing (`PATCH /matches/:id/frames/:frameNumber`, winner re-derived) via
  a per-row Edit modal, and "remove last frame" (`DELETE …/frames/last`).
- Interactive drill editor: draggable shot-line endpoints, movable + resizable
  target zones, draggable text annotations, click-to-select with a contextual
  selected-element panel (delete + text/label). New zones/paths/annotations
  auto-select. Drill templates are now editable (library form doubles as an edit
  form, pre-filled including the table layout → `PATCH /drill-templates/:id`).
- Verified frame edit prefill, field alignment and all drill-editor interactions
  (line/zone/annotation select, drill edit) functionally via Playwright.

**Open item (resolved):** the `MISSING_MESSAGE` console warnings for system drill
zone/path labels are fixed — `drill-localization` now checks `t.has(key)` before
calling `t(key)`, so missing optional labels fall back silently instead of
logging an error.

### Matches editing + input easing + tooltips everywhere (2026-06-03)

**Delivered:**

- Add-frame: no frame-number field (API auto-increments) and no winner field
  (derived from the entered score) — fewer inputs per frame.
- Match editing: the create modal doubles as an edit modal (Edit button on the
  match detail) pre-filled from the match via `matchToFormValues`; submit routes
  to `PATCH /matches/:id`.
- Removed the Analytics nav entry (duplicated the dashboard) from desktop More
  and the mobile More sheet. The `/analytics` route still exists, just unlinked.
- `InfoTooltip` now renders in a body portal with fixed positioning, so tooltips
  are never clipped by a card/modal `overflow` or hidden behind a stacking
  context. The shared tooltip `Field` replaced the per-page local Field in
  drills, training, profile and calendar (hints are now "?" tooltips).
- Country is a curated ISO-2 `CountrySelect` in matches + profile (pick, don't
  type); profile normalizes legacy non-2-char values so they stop blocking save.
- Verified edit prefill + unclipped modal tooltip + country select via Playwright.

### Player avatar (2026-06-03)

**Delivered:**

- `PlayerProfile.avatar` column (migration `20260603120000_add_player_avatar`):
  stores a preset id or a cropped image data URL.
- `PATCH /players/me/profile/avatar` (+ `UpdateAvatarSchema`) updates only the
  avatar, so it persists even when other profile fields are incomplete/invalid.
- Web: `PlayerAvatar` (photo / coloured preset glyph / initials fallback),
  `AvatarPicker` (six round preset "people" + photo upload) and a dependency-free
  circular `AvatarCropper` (drag + zoom → 256px JPEG). The profile page leads
  with an editable avatar hero; the header `UserMenu` shows the avatar too
  (picking one saves immediately). i18n `profile.avatar.*` in ru/en/uk.
- Verified upload → crop → save → persist (header + hero) with Playwright.

### Matches page redesign + tooltip fields (2026-06-03)

**Delivered:**

- New `Field` + `InfoTooltip` primitives: field hints moved from a permanent
  helper line under each input to a "?" tooltip next to the label (hover / tap /
  keyboard, Escape-closable). Keeps dense forms uncluttered.
- Matches page de-cluttered: dropped the permanent third column; the long
  create-match form now opens in a `Modal` (triggered by a "+ New match" button
  in the list rail) and is grouped into Basics / Context / Statistics /
  Links sections. Page is now a two-column list + detail; detail still comes
  first on mobile. Verified desktop + modal + tooltip with Playwright.
- i18n: `matches.newMatch.{open,close,sections.*}` in ru/en/uk.

Pattern to roll out to the other forms once approved.

### Site-wide redesign — foundation + dashboard (2026-06-03)

Goal: a more modern, tablet/mobile-friendly, less-cluttered, subscription-grade
UI. Rolled out incrementally page by page on top of a shared foundation.

**Delivered (foundation + dashboard):**

- Design foundation: ambient brand glow + `.surface`/`.surface-hover` in
  `globals.css`; shared primitives in `components/ui/` (`Card`, `SectionCard`,
  `PageHeader`, `StatTile`, `EmptyState`) and a line `icons.tsx` set.
- App-like navigation: `MobileTabBar` (fixed bottom bar on `< lg` with a "More"
  sheet); the top `MainNav` is now `lg`-only. Container adds `pb-24 lg:pb-8`.
- Dashboard rebuilt on the primitives: `PageHeader` with eyebrow, KPI
  `StatTile`s with icons in a 2-col mobile grid, `SectionCard` chart/section
  panels, `EmptyState`. Verified desktop + mobile with Playwright.

**Rollout (all pages):** `PageHeader`, `.surface` cards and `.btn-primary`
applied across training, drills, matches, AI, calendar, analytics, profile and
external-data; analytics rebuilt on `StatTile`/`SectionCard` like the dashboard;
`AccordionSection` upgraded to the elevated surface. Removed `autoFocus` from
always-visible inline forms (it made mobile browsers scroll past the page to the
form on load); kept it only inside the training new-session modal. Verified
desktop + mobile with Playwright.

### Training page redesign (2026-06-02)

**Delivered:**

- Rebuilt `/training` as a two-column layout (session rail + single working
  column). The new-session form moved into a `Modal` (new
  `components/layout/Modal.tsx`), removing the third column that overlapped the
  center panel and simplifying the page for fast coach data-entry.
- The working column now leads with the active drill: large attempt tally
  (attempts / successes / success rate) and big colour-coded outcome buttons,
  with attempt history + table snapshot in a collapsed accordion and session
  meta shown as compact pills. Mobile shows the working column first.
- i18n: added `training.newSession`, `training.startTitle/startSubtitle`,
  `training.actions.close`, `training.execution.{current,successRate,finishedNote,sessionDrills}`,
  `training.attempts.title` across ru/en/uk (locales verified in sync, 1007 keys).

**Verified:** Playwright screenshots of desktop, mobile and the new-session
modal on the rebuilt web image.

### First-version focus pass — drills, training, layout (2026-06-02)

**Delivered:**

- Drill table editor: layout presets (empty / full rack / colours / long pot /
  Line Up) and a reds stepper (0–15) so a coach picks a drill shape and dials
  the ball count instead of placing each ball by hand.
- Training: "undo attempt" button + `DELETE /drill-executions/:id/attempts/last`
  endpoint (mis-tap correction); attempt buttons colour-coded by outcome
  (success/partial/miss/skipped); added `state.success` colour token.
- Layout: on mobile the working panel now comes first — the detail/active
  section uses `order-first xl:order-none` on training, matches and AI, so the
  primary workspace is no longer buried under the long left-hand list. The AI
  generate-report form is `defaultOpen` for consistency with the other pages.
- Tooling: Playwright screenshot scripts (`scripts/ui-screenshots.mjs`,
  `scripts/ui-inspect.mjs`) for design review without the Chrome extension.

**Verified:** rebuilt web/api/worker Docker images; logged in as the demo
player via Playwright and confirmed the new editor, training controls, and the
mobile re-ordering at desktop (1440) and mobile (390) widths.

### Review & hardening pass (2026-06-02)

**Delivered:**

- Restored repo-wide linting: added a shared root flat ESLint config
  (`eslint.config.mjs`) so `pnpm lint` works again across all packages (it was
  fully broken under ESLint 9 with no config). `apps/web` now lints with the
  ESLint CLI instead of the deprecated `next lint`.
- Fixed cross-user data exposure: logout now calls `queryClient.clear()` so a
  second user on the same browser cannot read the previous session's cached
  data (some query keys are not token-scoped).
- Fixed CueTracker break-tier counts: `breaks50`/`breaks70` were excluding
  centuries, diverging from the WST parser and the `50+/70+/100+` UI labels.
  They are now cumulative and consistent across all match sources.
- Standardized the `player-profile`/`equipment-profiles` query keys in
  `ProfileClient` to be token-scoped like every other screen, removing a
  duplicate cache entry for the same data.
- Removed a dead `matchesSkipped` counter path in the worker import (always 0;
  the import upserts every match — documented inline until a skip path exists).
- Docs updated: `architecture.md` (linting), `database-model.md` (cumulative
  break-tier semantics).

**Open items (surfaced, not yet actioned):**

- External-sync UI refreshes imported matches via a fixed 5s `setTimeout`
  instead of polling job status; should reuse the AI-report polling pattern.
- `PATCH /matches/:id` can persist `framesWon/framesLost` that disagree with
  saved frame rows; should recompute from frames when they exist.
- Several `react-hooks/exhaustive-deps` and a11y (`aria-describedby` on form
  errors) warnings remain as non-blocking lint warnings.

### Post PH-1-011 external analytics import

**Delivered:**

- CueTracker sync now normalizes match rows by current-player/opponent order,
  so imported frame scores, match result, points and breaks stay correct even
  when the player appears second on the source page.
- External-data match selection can create focused AI reports over exactly the
  selected imported matches. External-analysis reports now expose their selected
  match snapshot to the UI so `/ai` can render score, break, average-points and
  frame-map charts before the text analysis.
- Imported external matches now keep referee, format, opponent external id,
  head-to-head URL, progress, points-per-frame, player/opponent break lists
  and frame-level raw score context.
- CueTracker sync fetches bounded per-opponent head-to-head pages and stores
  comparison, match-stat and round-stat snapshots in `ExternalImportJob.logJson`
  for future AI coaching analysis.
- Weekly AI report source snapshots now include match frames and the latest
  external import analytics.

### PH-1-011 — Docker production deploy

**Delivered:**

- Added production Compose file `docker-compose.prod.yml` for web, api,
  worker, postgres, redis, minio, nginx and a one-shot `migrate` service.
- Added `.env.production.example` for `snooker.appshub.pl`, including
  `NEXT_PUBLIC_API_URL=/api`, production CORS, secure refresh-cookie settings
  and loopback nginx bind for host TLS termination.
- Added `.dockerignore` so Docker builds do not send local `node_modules`,
  build outputs, logs or secret env files as context.
- Web Docker image now builds Next.js in `standalone` mode with a build-time
  API base URL and runs the traced server as a non-root user.
- API and worker images use reproducible frozen-lockfile installs and run as
  non-root users; worker image generates Prisma Client before compiling.
- Nginx now serves `snooker.appshub.pl`, proxies `/api/*` to NestJS, exposes
  `/health`, caches `_next/static` assets and preserves forwarded headers.
- API refresh-cookie path and secure flag can be configured per environment,
  which keeps httpOnly refresh rotation working behind `/api/auth/*`.

**Open items:**

- Server-side TLS certificate and host-nginx site for `snooker.appshub.pl`
  must be configured on the target machine before public HTTPS cutover.
- Real production secrets must be written to the server `.env`; committed
  files intentionally contain placeholders only.

### Post PH-1-010 default training library

**Delivered:**

- Added Prisma migration `20260520120700_seed_system_drill_templates`, which
  creates an inactive system coach account and seeds eight immutable
  `system` drill templates.
- The default library covers cue action, long potting, positional play, break
  building, safety, snooker escape, pressure routine and match simulation.
- Every seeded drill includes a metrics schema and a visual
  `defaultTableLayoutJson`, so new players can immediately add useful drills
  to real training sessions and receive a copied table-layout snapshot.
- Docs updated: `docs/database-model.md`, `docs/api-spec.md`,
  `docs/development-log.md`.

### Post PH-1-010 audit hardening

**Delivered:**

- Refresh tokens moved out of web `localStorage` into an httpOnly
  `snooker_refresh` cookie scoped to `/auth`; auth responses now expose only
  access-token fields to browser JavaScript.
- Web API client retries one authenticated request after a 401 by calling
  `/auth/refresh` with credentials, then updates the access token in the
  Zustand auth store.
- Auth forms use `method="post"` so credentials cannot leak into the URL if a
  user submits before React hydration finishes.
- API now emits baseline security headers (`nosniff`, `DENY`, CSP,
  `no-referrer`, permissions policy, HSTS in production).
- Shared input schemas now validate date strings, cap table-layout arrays and
  calendar metadata size, and require manual match links to be HTTP(S) URLs.
- Route `:id` params use a CUID validation pipe before service logic; malformed
  ids return `validation.failed` instead of falling through to Prisma.
- AI report generation is throttled and its BullMQ queue is created lazily, so
  normal API startup no longer requires a live Redis connection.
- Training attempt and match-frame auto-numbering now use serializable
  transaction retry to avoid race-condition 500s on rapid duplicate clicks.
- Header navigation remains visible as a horizontal scroll rail on mobile.

**Validation:**

- Browser smoke on fresh API/web servers covered registration, dashboard,
  profile, drills, training, matches, calendar and AI pages at desktop and
  mobile widths; no horizontal overflow or page-level API errors were found.
- HTTP smoke verified security headers, invalid-CUID `400`, httpOnly refresh
  cookie rotation, and absence of refresh tokens in JSON auth responses.

### PH-1-010 — Weekly AI summary

**Delivered:**

- Prisma migration `20260520120600_add_ai_reports` adds `AIReport`,
  `AIReportType` and `AIReportStatus` for saved generated reports.
- `packages/shared/src/schemas/ai.ts` exports DTOs for AI reports and weekly
  report generation requests; `packages/shared/src/queues/ai.ts` exports the
  BullMQ queue/job contract used by API and worker.
- NestJS `AiModule` exposes guarded current-player endpoints for listing,
  reading and generating weekly AI reports.
- Report generation snapshots the source data, stores a stable source hash,
  data-source counts, prompt version, provider and model before enqueueing
  the worker job.
- Worker consumes `ai-report-generation`, reads the weekly-summary prompt and
  calls Anthropic when `AI_PROVIDER=anthropic` and `AI_API_KEY` is present;
  otherwise it writes a safe local markdown fallback.
- Web `/ai` shows report history, status polling, saved report metadata,
  data-source counts and a period form for creating a weekly summary.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under `ai.*`.
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`,
  `docs/ai-spec.md`, `docs/ui-guidelines.md`, `docs/development-log.md`.

**Open items:**

- Anthropic output quality still depends on a real `AI_API_KEY` in the target
  environment. Without a key the local fallback is intentionally conservative.
- `AIInsight` and coach handover reports remain later AI features.

### PH-1-009 — Calendar factors

**Delivered:**

- Prisma migration `20260520120500_add_calendar_factors` adds
  `CalendarEvent`, `LifestyleFactor`, `SupplementEvent`, `CalendarEventType`
  and `CalendarEventSource`.
- `packages/shared/src/schemas/calendar.ts` exports DTOs for creating and
  updating calendar events, daily lifestyle factors and supplement periods.
- NestJS `CalendarModule` exposes guarded current-player endpoints for
  `/calendar-events`, `/lifestyle-factors` and `/supplement-events`.
- Lifestyle factors are unique per player/date; `POST /lifestyle-factors`
  saves the submitted day idempotently through an upsert.
- Web `/calendar` now shows event timeline, daily lifestyle records,
  supplement periods and compact forms for all three resources.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under
  `calendar.*`.
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`,
  `docs/ui-guidelines.md`, `docs/development-log.md`.

**Open items:**

- Coach access to wellness/supplement data still requires explicit
  `wellness:read` permission and audit logging before shared coach views.
- Analytics/AI may show correlations later, but must not state medical
  causality or supplement advice.

### PH-1-008 — Manual match log

**Delivered:**

- Prisma migration `20260520120400_add_match_log` adds `Match`,
  `MatchFrame`, `MatchResult`, `MatchSource` and `FrameWinner`.
- `packages/shared/src/schemas/match.ts` exports DTOs for manual match
  creation, match updates and adding frames.
- NestJS `MatchesModule` exposes guarded current-player endpoints for listing,
  reading, creating and updating matches, plus adding frames.
- Frame creation protects current-player ownership and recalculates match
  frame score/result from saved frame winners.
- Web `/matches` now shows match history, selected match details, key stats,
  frame table, add-frame form, opponent history and a manual match creation
  panel.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under `matches.*`.
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`,
  `docs/ui-guidelines.md`, `docs/development-log.md`.

**Open items:**

- Shot-by-shot mode remains a later analytics feature. The PH-1-008 schema
  keeps match/frame ownership boundaries ready for future `Shot` rows.

### PH-1-007 — Basic dashboard

**Delivered:**

- `packages/shared/src/schemas/dashboard.ts` exports the dashboard period,
  totals, weekly point, drill progress, recent session and full
  `PlayerDashboard` DTOs.
- NestJS `DashboardModule` exposes guarded `GET /players/me/dashboard` for
  the current user, deriving a 28-day overview from existing training
  sessions and drill executions without a new database migration.
- Dashboard aggregates include sessions, finished/open sessions, training
  minutes, drill executions, attempts, successes, success rate, four weekly
  buckets, match-performance summary, top drill progress and five recent
  sessions.
- Users without a player profile receive empty dashboard aggregates, keeping
  the page useful immediately after registration.
- Web `/dashboard` now renders KPI tiles, Recharts training-volume and
  success-trend charts, drill progress rows, recent sessions and empty/auth
  states through `DashboardClient`.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under
  `dashboard.*`.
- Docs updated: `docs/api-spec.md`, `docs/ui-guidelines.md`,
  `docs/development-log.md`.

**Open items:**

- Break-building stats and long-term season views remain planned analytics
  follow-ups.

### PH-1-006 — SnookerTableCanvas

**Delivered:**

- Added `apps/web/src/components/table-renderer/` with `SnookerTableCanvas`,
  `DrillLayoutEditor`, `TableLayoutPreview` and layout factory helpers.
- `SnookerTableCanvas` renders the table surface, cushions, pockets, baulk
  line/D, all ball colors, target zones, shot paths and annotations using
  `react-konva` with millimetre-based responsive scaling.
- The web app renderer runtime was aligned to React 19 + `react-konva` 19;
  `@snooker/ui` now accepts React 18 or 19 as a peer to avoid duplicate React
  copies in the web bundle.
- `edit` mode supports drag-and-drop ball movement and exposes renderer events
  without owning drill or training business state.
- `DrillLayoutEditor` adds template editing controls for standard reset,
  balls, target zones, shot lines, JSON import and PNG export.
- `/drills` now saves a visual `defaultTableLayout` for new drill templates
  and shows previews in template cards.
- `/training` now shows the copied `tableLayoutSnapshot` in the active drill
  execution detail.
- `packages/snooker-domain` table optional types now match the Zod-inferred
  shared layout DTOs under `exactOptionalPropertyTypes`.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under
  `tableRenderer.*` and `training.tableLayout.*`.
- Docs updated: `docs/table-renderer-spec.md`, `docs/ui-guidelines.md`,
  `docs/development-log.md`.

**Open items:**

- Direct target-zone resizing and freehand path drawing remain future editor
  polish after real drill layouts are tested.
- Physics, replay, ghost-ball and projected cue-ball overlays remain planned
  for later renderer phases.

### PH-1-005 — Training session flow

**Delivered:**

- Prisma migration `20260520120300_add_training_flow` adds
  `TrainingSession`, `DrillExecution`, `DrillAttempt`, session type enums and
  attempt result enums.
- `packages/shared/src/schemas/training.ts` exports DTOs for creating,
  updating and finishing sessions, adding drill executions, recording attempts
  and finishing executions.
- NestJS `TrainingModule` exposes guarded session and drill-execution endpoints
  with current-player ownership checks and visible-drill-template checks.
- Attempt creation appends the next attempt number in a transaction and updates
  execution attempt/success counters with the same write.
- Finished sessions reject new drill executions; finished drill executions
  reject new attempts. Repeated finish calls return the already-finished
  resource instead of shifting its end time.
- Web `/training` page lists recent sessions, starts a session, adds visible
  drill templates, records compact attempt outcomes and finishes drills or
  sessions.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under `training.*`.
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`,
  `docs/ui-guidelines.md`, `docs/development-log.md`.

**Open items:**

- Attempt write idempotency is not generic yet; shared `Idempotency-Key`
  handling remains a PH-2 hardening item.
- The table layout snapshot is copied from the template/default payload.
  PH-1-006 added the first visual editor and preview surface.

### PH-1-004 — Drill library

**Delivered:**

- Prisma `DrillTemplate` model and migration
  `20260520120200_add_drill_templates`, with enums for category,
  difficulty and visibility.
- `packages/shared/src/schemas/drill.ts` exports drill template DTOs,
  category/difficulty/visibility schemas, metric schemas and a table-layout
  JSON schema.
- `packages/snooker-domain/src/drills/types.ts` now mirrors template metrics,
  visibility and optional default table layout while staying renderer-free.
- NestJS `DrillsModule` under `apps/api/src/modules/drills/` exposes guarded
  `/drill-templates` list/get/create/update/delete endpoints with ownership
  checks. Shared/system templates are readable; only current-user templates
  are mutable.
- Web `/drills` page under the `(app)` shell lists visible templates and
  creates user-owned templates with a metric-row editor.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under `drills.*`.
- Added the required Next.js root `app/layout.tsx` and moved locale providers
  into nested `[locale]/layout.tsx`, which makes `next build` pass cleanly.
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`,
  `docs/ui-guidelines.md`, `docs/development-log.md`.

**Open items:**

- Richer direct layout editing gestures continue in renderer follow-ups after
  PH-1-006 introduced `SnookerTableCanvas`.

### Review hardening after PH-1-003

**Delivered:**

- Verified `.env` is ignored and has never been committed to git history.
- Renamed equipment migration to `20260520120100_add_equipment_profiles` so
  Prisma applies it after `20260520120000_init` on fresh databases; local
  `_prisma_migrations` metadata was updated without resetting data.
- Replaced JWT fallback secret with required `API_JWT_SECRET` startup config.
- Restricted CORS to `CORS_ORIGINS` (local default only outside production;
  production disables CORS if no allow-list is configured).
- Added global API rate limiting plus tighter throttles on auth endpoints.
- Scoped Zod validation pipes to request bodies, avoiding accidental parsing
  of `@Req`, `@Ip` or route params.
- Login now rejects non-`ACTIVE` users with the generic invalid-credentials
  error code.
- Redis host port is exposed for local dev and Docker containers override
  `REDIS_URL` back to the internal service address.
- Dependency hardening completed: NestJS packages upgraded to 11.x,
  `next-intl` upgraded to 4.x, `postcss` pinned through a `pnpm` override for
  Next's transitive dependency, and `pnpm audit --audit-level moderate` now
  reports no known vulnerabilities.

**Open items:**

- Refresh tokens are still kept in the PH-1 client-side Zustand store. This is
  tracked as a PH-2 hardening item: move refresh tokens to httpOnly cookies
  and add SSR-aware route protection.

### PH-1-003 — Player profile CRUD + equipment profile

**Delivered:**

- Prisma `EquipmentProfile` model and migration
  `20260520120100_add_equipment_profiles`.
- `packages/shared/src/schemas/player.ts` now exports schemas/types for
  player profile upsert plus equipment create/update/read DTOs.
- NestJS `PlayersModule` under `apps/api/src/modules/players/` with guarded
  endpoints for current-user profile and equipment profiles.
- Web `/profile` page under the `(app)` shell. It edits player profile data,
  creates equipment profiles and lists/deletes existing equipment entries.
- Header navigation now includes Profile.
- i18n keys added in all three locales (`ru`, `en`, `uk`) under `profile.*`
  and `nav.profile`.
- Local development Postgres host port changed to 5433; Docker API/worker
  keep using the internal `postgres:5432` service URL via Compose override.
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`,
  `docs/ui-guidelines.md`, `docs/deployment.md`.

**Open items:**

- `/profile` still relies on the PH-1-002 client-side token store. Server-side
  route protection and httpOnly refresh tokens remain a PH-2 hardening item.

### PH-1-002 — Web app shell + auth UI

**Delivered:**

- Route groups: `apps/web/src/app/[locale]/(app)/` for authenticated
  surfaces and `(auth)/` for the login/register funnel.
- `Header`, `LocaleSwitcher`, `UserMenu` components under
  `src/components/layout/`. Header carries logo, primary navigation
  (dashboard / training / drills / matches / calendar / analytics),
  language switcher and user menu.
- `AuthForm` (login + register) with React Hook Form + brand-styled inputs;
  posts to the API via the new `lib/api-client.ts` typed fetch wrapper and
  stores the session in `lib/auth-store.ts` (Zustand + persist to
  `localStorage` under `snooker.auth`).
- `providers/QueryProvider.tsx` wires TanStack Query into the root locale
  layout (`staleTime: 30s`, `retry: 1`).
- `next-intl/navigation` helpers exposed via `src/i18n/navigation.ts`
  (locale-aware `Link`, `useRouter`, `usePathname`).
- Landing page (`[locale]/page.tsx`) now offers Login and Register CTAs.
- Old `[locale]/dashboard/page.tsx` removed; dashboard now lives under
  `[locale]/(app)/dashboard/page.tsx` (same URL, wrapped in the shell).
- i18n keys added in all three locales (`ru`, `en`, `uk`):
  `auth.*`, `dashboard.*`, `home.cta.{login,register}`,
  `errors.api.{auth,validation,generic}.*`.
- `docs/ui-guidelines.md` updated with the new layout primitives and
  auth-UI conventions.

**Open items:**

- Auth UI is fully client-rendered for MVP; no route protection at the
  middleware/server level yet. PH-2 will move refresh tokens into
  httpOnly cookies and add SSR-aware redirects.

### PH-1-001 — Auth foundation (backend)

**Delivered:**

- Prisma `RefreshToken` model + initial migration SQL under
  `apps/api/prisma/migrations/20260520120000_init/`.
- Zod schemas in `@snooker/shared`: `RegisterSchema`, `LoginSchema`,
  `RefreshSchema`, `TokensSchema`, `AuthMeSchema`, `AuthSessionSchema`.
- Stable error codes in `@snooker/shared/errors/codes` (`ErrorCodes.Auth.*`).
- NestJS modules:
  - `PrismaModule` (global, with lifecycle hooks).
  - `AuthModule` with `AuthService`, `TokensService`, `JwtAuthGuard`,
    `CurrentUserId` decorator.
- Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`,
  `POST /auth/logout`, `GET /auth/me`.
- Refresh tokens: stored as sha-256 hash, rotated on use, revocation log.
- Access tokens: HS256 JWT, 15 min TTL; refresh 30 days.
- Password hashing: `argon2id` (replaces planned bcrypt).
- Global `HttpErrorFilter` normalizes errors into `{ error: { code, ... } }`.
- Global `ZodValidationPipe` for request validation.
- New deps in `apps/api`: `@nestjs/jwt`, `argon2`. Dropped `nestjs-zod` in
  favor of an in-house pipe (keeps `@snooker/shared` framework-free).
- Docs updated: `docs/api-spec.md`, `docs/database-model.md`.

### Phase 1 plan (epics)

1. ✅ PH-1-001 — Auth foundation (backend).
2. ✅ PH-1-002 — Web app shell + login/register UI + LocaleSwitcher.
3. ✅ PH-1-003 — Player profile CRUD + equipment profile.
4. ✅ PH-1-004 — Drill library (categories, templates, metrics schema, table layout).
5. ✅ PH-1-005 — Training session flow.
6. ✅ PH-1-006 — SnookerTableCanvas (react-konva).
7. ✅ PH-1-007 — Basic dashboard.
8. ✅ PH-1-008 — Manual match log.
9. ✅ PH-1-009 — Calendar factors.
10. ✅ PH-1-010 — Weekly AI summary (Anthropic).
11. PH-1-011 — Docker production deploy.

---

## Phase 0 — Foundation

**Status:** ✅ Complete (2026-05-20).

**Goal:** scaffold the monorepo, agree on stack and rules, set up i18n,
documentation and deployment plumbing so all subsequent work fits into a
consistent skeleton.

**Delivered:**

- pnpm monorepo: `apps/{web,api,worker}` + `packages/{shared,snooker-domain,ui,ai-prompts}`.
- Next.js 15 (App Router) web app with `next-intl`, locales `ru` (default), `en`, `uk`.
- NestJS 10 API skeleton with `/health` and Swagger at `/docs`.
- Prisma schema with initial `User`, `Role`, `PlayerProfile`, `CoachProfile`.
- BullMQ worker placeholder.
- Docker Compose stack: web, api, worker, postgres, redis, minio, nginx.
- Engineering rules persisted as `AGENTS.md`, `.github/copilot-instructions.md`,
  `.github/instructions/{i18n,docs-sync}.instructions.md`, and repo memory.
- Documentation set under `docs/`: architecture, ui-guidelines, i18n,
  database-model, api-spec, deployment, ai-spec, table-renderer-spec,
  agent-guidelines, brand, this log.
- ADRs 0001 (web-first PWA), 0002 (i18n with next-intl), 0003 (react-konva MVP),
  0004 (product scope: single player, player-owned data, Anthropic, SSH deploy).
- Brand palette applied to Tailwind config and CSS variables.
- Logo and favicon slots wired into `<head>` and landing page; binary files
  to be dropped into `apps/web/public/` per `apps/web/public/README.md`.

**Decisions:**

- Single player initially (multi-tenant schema kept for later, no UI surface).
- Data ownership: **player** (parent acts on behalf of player when minor).
- LLM provider: **Anthropic** (`AI_PROVIDER=anthropic`). Pluggable interface preserved.
- Production deploy: **SSH + Docker Compose** to the VPS pattern (same as previous projects).
- `corepack` is optional; `npm i -g pnpm@9.12.0` is the supported install path
  (nvm-windows + corepack hits EPERM without admin).

**Open items:**

- User to set `AI_API_KEY` in `.env` when Anthropic summaries are required;
  the PH-1-010 implementation falls back to a safe local markdown summary when
  no provider key is available.

---

## Phase 1 — MVP (planned)

**Status:** ⏳ Not started.

**Goal:** a coach can run a real training session end-to-end. By the end of
Phase 1 the system can ingest sessions, drills, attempts, errors, notes;
render a basic table layout; and generate a weekly AI summary.

**Planned epics:**

1. Auth (registration, login, JWT, refresh) + roles wiring.
2. Player profile CRUD; equipment profile.
3. Drill library (categories, templates, metrics schema, table layout).
4. Training session flow: create, add drills, record attempts, finish.
5. SnookerTableCanvas (react-konva): view + drag-and-drop editor.
6. Basic dashboard (training volume, drill success trend).
7. Manual match log.
8. Calendar factors (lifestyle, supplement, equipment, coach change).
9. Weekly AI summary (Anthropic provider).
10. Docker production deploy.

Each epic ships with: Prisma migration, Zod DTOs in `packages/shared`,
NestJS module, web pages, i18n keys in all three locales, tests, and doc
updates.

---
