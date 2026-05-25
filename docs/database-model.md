# Database Model

The canonical schema lives in [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).
This document mirrors the TZ §9–10 entity map and tracks the planned rollout.

## Entities (target)

Implemented in initial migration:

- `User`
- `Role`
- `RefreshToken` — sha-256 hash of the raw token is stored; `expiresAt`,
  optional `revokedAt`, `userAgent`, `ipAddress` for session bookkeeping.
- `PlayerProfile`
- `EquipmentProfile` — belongs to `PlayerProfile`; records cue, tip, chalk,
  extension, notes and active period (`activeFrom`, optional `activeTo`).
- `CoachProfile`
- `DrillTemplate` — reusable library item with category, difficulty, metrics
  schema JSON, optional default table layout JSON, tags and visibility.
- `TrainingSession` — player-owned practice session with type, goal, fatigue,
  intensity, focus and notes.
- `DrillExecution` — a drill template instance inside a session, with counters,
  optional result JSON, error tags and table layout snapshot JSON.
- `DrillAttempt` — numbered attempt log under one drill execution.
- `Match` — player-owned manual match log entry with opponent, location,
  score, break counts, key percentages, links and notes.
- `MatchFrame` — numbered frame row under one match with score, winner, high
  break, optional duration and notes.
- `CalendarEvent` — player-owned manual/external timeline event for training,
  match, travel, rest, equipment, coach and custom factors.
- `LifestyleFactor` — one daily player-owned wellness/lifestyle record with
  sleep, fatigue, stress, focus, mood, travel/illness/injury flags and notes.
- `SupplementEvent` — player-owned supplement period with category, dates,
  dosage note, reason and notes.
- `AIReport` — player-owned generated report with period, source-data hash,
  source snapshot JSON, data-source counts JSON, prompt/provider metadata,
  status and markdown result.

Planned (next migrations, in this order):

1. `PlayerCoachRelation`, `Academy`, `Club`
2. `TrainingBlock`
3. `Tournament`, `Shot`
4. `AIInsight`
5. `ExternalDataSource`, `ExternalImportJob`, `ExternalImportedRecord`
6. `Attachment`, `CoachNote`, `PlayerNote`

Each new entity ships with:

- Prisma model + migration
- Zod schema in `packages/shared`
- API resource module
- doc update in this file (column list + invariants)

## Conventions

- Primary keys: `cuid()` strings.
- Timestamps: `createdAt`, `updatedAt` on every aggregate root.
- Soft delete is not used; explicit `status` enums when needed.
- JSONB columns (`*_json`) carry version-tolerant payloads (table layouts,
  raw external import bodies, AI report structures).

## Implemented columns

### PlayerProfile

- `id`, `userId` (unique), `firstName`, `lastName`, optional `dateOfBirth`,
  optional `country`, optional `dominantHand`, optional `level`, optional
  `seasonGoal`, `createdAt`, `updatedAt`.

### EquipmentProfile

- `id`, `playerProfileId`, optional `cueName`, optional `cueWeight`, optional
  `tipBrand`, optional `tipSize`, optional `tipChangeDate`, optional
  `extension`, optional `chalk`, optional `notes`, `activeFrom`, optional
  `activeTo`, `createdAt`, `updatedAt`.
- Deleting a `PlayerProfile` cascades to its equipment profiles.
- Multiple equipment profiles can overlap in MVP; analytics can later infer
  active intervals from `activeFrom` / `activeTo`.

### DrillTemplate

- `id`, `name`, `category`, `difficulty`, `description`, `goal`, `rules`,
  `successCriteria`, `metricsSchemaJson`, optional `defaultTableLayoutJson`,
  `tags`, `visibility`, `createdByUserId`, `createdAt`, `updatedAt`.
- `category`, `difficulty` and `visibility` are PostgreSQL enums mapped from
  the lowercase domain/API values.
- `metricsSchemaJson` follows `DrillMetricsSchema` (`version: 1`, array of
  metric definitions). `defaultTableLayoutJson` follows the table layout
  shape used by `packages/snooker-domain`.
- User create/update DTOs allow `private` and `shared`; `system` is reserved
  for seeded templates and cannot be created through the user API.
- Migration `20260520120700_seed_system_drill_templates` creates an inactive
  system coach user and seeds the initial `system` drill library. The seeded
  templates cover cue action, potting, positional play, break building,
  safety, snooker escape, pressure training and match simulation; each one has
  metrics and a visual `defaultTableLayoutJson` so fresh installs are useful
  before a player creates private templates.

### TrainingSession

- `id`, `playerProfileId`, `createdByUserId`, `startedAt`, optional `endedAt`,
  `sessionType`, `title`, optional `goal`, optional `intensity`, optional
  `fatigueBefore`, optional `fatigueAfter`, optional `focusLevel`, optional
  `mood`, optional `notes`, `createdAt`, `updatedAt`.
- `sessionType` is a PostgreSQL enum mapped from lowercase API values:
  `solo`, `coached`, `match_prep`, `review`, `other`.
- Deleting a `PlayerProfile` cascades to its training sessions. Deleting the
  creating `User` also cascades through the `createdBy` relation.

### DrillExecution

- `id`, `trainingSessionId`, `drillTemplateId`, `playerProfileId`, `startedAt`,
  optional `endedAt`, `attempts`, `successes`, optional `score`, optional
  `maxRun`, optional `averageScore`, optional `resultJson`, `errorTags`,
  optional `coachNotes`, optional `playerNotes`, optional
  `tableLayoutSnapshotJson`, `createdAt`, `updatedAt`.
- Each execution belongs to one session and one player profile. The API only
  creates executions for sessions owned by the current user's profile.
- `drillTemplateId` uses `ON DELETE RESTRICT` so historical executions are not
  left pointing at a missing template.

### DrillAttempt

- `id`, `drillExecutionId`, `attemptNumber`, `result`, optional `score`,
  optional `potSuccess`, optional `positionSuccess`, optional `missType`,
  `errorTags`, optional `shotTimeMs`, optional `notes`, `createdAt`.
- `(drillExecutionId, attemptNumber)` is unique. The API appends attempts in a
  transaction and increments execution counters with the same write.
- `result` is a PostgreSQL enum mapped from lowercase API values: `success`,
  `partial`, `miss`, `skipped`.

### Match

- `id`, `playerProfileId`, `createdByUserId`, `matchDate`, optional
  `tournament`, optional `country`, optional `city`, optional `club`,
  `opponentName`, optional `opponentExternalId`, optional `round`, optional
  `format`, `framesWon`, `framesLost`, optional `highBreak`, `breaks50`,
  `breaks70`, `breaks100`, optional `decidingFrameResult`, optional
  `safetySuccess`, optional `longPotSuccess`, optional `unforcedErrors`,
  optional `tacticalErrors`, `result`, `source`, optional `sourceUrl`,
  optional `videoUrl`, optional `notes`, `createdAt`, `updatedAt`.
- `result` is a PostgreSQL enum mapped from lowercase API values:
  `player_win`, `opponent_win`, `draw`, `unknown`.
- `source` is a PostgreSQL enum mapped from lowercase API values: `manual`,
  `external`. CueTracker import writes external matches with normalized
  player/opponent orientation, `opponentExternalId`, `format`,
  `sourceUrl`, frame-derived breaks and JSON notes containing referee,
  head-to-head URL, points-per-frame, progress and raw break context.
- Deleting a `PlayerProfile` cascades to its matches. Deleting the creating
  `User` also cascades through the `createdBy` relation.

### MatchFrame

- `id`, `matchId`, `frameNumber`, optional `playerScore`, optional
  `opponentScore`, `winner`, optional `highBreak`, optional
  `frameDurationSec`, optional `notes`, `createdAt`.
- `(matchId, frameNumber)` is unique. Adding a frame through the API
  recalculates `Match.framesWon`, `Match.framesLost` and `Match.result` from
  all saved frame winners.
- `winner` is a PostgreSQL enum mapped from lowercase API values: `player`,
  `opponent`, `unknown`.
- CueTracker import stores frame scores after normalizing the page's
  first/second player order to current-player/opponent order. `highBreak`
  stores the current player's highest break in the frame, while `notes`
  keeps raw frame score and both players' break lists for later AI analysis.

### CalendarEvent

- `id`, `playerProfileId`, `createdByUserId`, `eventType`, `title`, optional
  `description`, `startAt`, optional `endAt`, `source`, optional
  `metadataJson`, `createdAt`, `updatedAt`.
- `eventType` is a PostgreSQL enum mapped from lowercase API values:
  `training`, `tournament`, `match`, `travel`, `rest_day`, `illness`,
  `injury`, `equipment_change`, `coach_change`, `supplement_start`,
  `supplement_end`, `sleep_issue`, `school_workload`, `custom_factor`.
- `source` is a PostgreSQL enum mapped from lowercase API values: `manual`,
  `external`. PH-1-009 writes manual events only; external sync can reuse
  the same table.
- Deleting a `PlayerProfile` cascades to its calendar events. Deleting the
  creating `User` also cascades through the `createdBy` relation.

### LifestyleFactor

- `id`, `playerProfileId`, `date`, optional `sleepHours`, optional
  `sleepQuality`, optional `fatigue`, optional `stress`, optional `focus`,
  optional `mood`, `illness`, `injury`, `travel`, optional `notes`,
  `createdAt`, `updatedAt`.
- `(playerProfileId, date)` is unique. `POST /lifestyle-factors` upserts the
  daily factor for the submitted date so the UI can save a day repeatedly.
- Deleting a `PlayerProfile` cascades to its lifestyle factors.

### SupplementEvent

- `id`, `playerProfileId`, `createdByUserId`, `name`, optional `category`,
  `startDate`, optional `endDate`, optional `dosageNote`, optional `reason`,
  optional `notes`, `createdAt`, `updatedAt`.
- Deleting a `PlayerProfile` cascades to its supplement events. Deleting the
  creating `User` also cascades through the `createdBy` relation.

### AIReport

- `id`, `playerProfileId`, `createdByUserId`, `reportType`, `title`,
  `locale`, `periodStart`, `periodEnd`, `sourceDataHash`, `sourceDataJson`,
  `dataSourcesJson`, `promptVersion`, `provider`, `model`, `status`,
  optional `contentMarkdown`, optional `errorMessage`, optional `completedAt`,
  `createdAt`, `updatedAt`.
- `reportType` is a PostgreSQL enum mapped from lowercase API values; PH-1-010
  writes `weekly_summary` only.
- `status` is a PostgreSQL enum mapped from lowercase API values: `queued`,
  `running`, `completed`, `failed`.
- `sourceDataHash` is a sha-256 hash of stable stringified source snapshot
  data. It lets the UI and future jobs identify what exact inputs produced a
  report.
- `dataSourcesJson` stores aggregate counts for training sessions, drill
  executions, matches, calendar events, lifestyle factors, supplement periods
  previous AI reports and latest external import snapshots.
- Deleting a `PlayerProfile` cascades to its AI reports. Deleting the creating
  `User` also cascades through the `createdBy` relation.

### ExternalPlayerLink and ExternalImportJob

- `ExternalPlayerLink` connects a player profile to one external source
  (`wst` or `cuetracker`) with source id, original URL, optional display name,
  sync flag and last-sync timestamp. The model is unique per
  `(playerProfileId, source)`.
- `ExternalImportJob` tracks queued/running/completed/failed sync attempts,
  imported/skipped match counts, imported-stat flag, error message and
  `logJson`.
- CueTracker `logJson` stores the full import snapshot for AI use: season
  match/frame/point/break stats, imported match payloads, normalized frame
  details, and per-opponent head-to-head summaries including comparison,
  match stats and rounds played. This keeps rich external analytics available
  without adding a separate statistics table yet.

## Sensitive data

`LifestyleFactor`, `SupplementEvent`, wellness-tagged `CalendarEvent` rows and
AI report source snapshots that include those rows are sensitive. PH-1-009 and
PH-1-010 expose them only to the current player's own account. Coach sharing
will require explicit `wellness:read` permission and audit logging before
shared coach views are introduced. See TZ §16.3.
