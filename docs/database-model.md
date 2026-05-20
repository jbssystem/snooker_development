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

Planned (next migrations, in this order):

1. `PlayerCoachRelation`, `Academy`, `Club`
2. `DrillTemplate`, `DrillExecution`, `DrillAttempt`
3. `TrainingSession`, `TrainingBlock`
4. `Tournament`, `Match`, `Frame`, `Shot`
5. `CalendarEvent`, `LifestyleFactor`, `SupplementEvent`
6. `AIReport`, `AIInsight`
7. `ExternalDataSource`, `ExternalImportJob`, `ExternalImportedRecord`
8. `Attachment`, `CoachNote`, `PlayerNote`

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

## Sensitive data

`LifestyleFactor`, `SupplementEvent`, and any wellness-tagged
`CalendarEvent` are gated behind a `wellness:read` permission. Access is
audit-logged. See TZ §16.3.
