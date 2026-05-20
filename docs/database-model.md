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

Planned (next migrations, in this order):

1. `PlayerCoachRelation`, `Academy`, `Club`
2. `TrainingBlock`
3. `Tournament`, `Match`, `Frame`, `Shot`
4. `CalendarEvent`, `LifestyleFactor`, `SupplementEvent`
5. `AIReport`, `AIInsight`
6. `ExternalDataSource`, `ExternalImportJob`, `ExternalImportedRecord`
7. `Attachment`, `CoachNote`, `PlayerNote`

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

## Sensitive data

`LifestyleFactor`, `SupplementEvent`, and any wellness-tagged
`CalendarEvent` are gated behind a `wellness:read` permission. Access is
audit-logged. See TZ §16.3.
