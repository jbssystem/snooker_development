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
- `CoachProfile`

Planned (next migrations, in this order):

1. `PlayerCoachRelation`, `Academy`, `Club`
2. `EquipmentProfile`
3. `DrillTemplate`, `DrillExecution`, `DrillAttempt`
4. `TrainingSession`, `TrainingBlock`
5. `Tournament`, `Match`, `Frame`, `Shot`
6. `CalendarEvent`, `LifestyleFactor`, `SupplementEvent`
7. `AIReport`, `AIInsight`
8. `ExternalDataSource`, `ExternalImportJob`, `ExternalImportedRecord`
9. `Attachment`, `CoachNote`, `PlayerNote`

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

## Sensitive data

`LifestyleFactor`, `SupplementEvent`, and any wellness-tagged
`CalendarEvent` are gated behind a `wellness:read` permission. Access is
audit-logged. See TZ §16.3.
