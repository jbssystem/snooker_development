# API Spec

Generated OpenAPI is served at `/docs` from the running API (Swagger UI).
This document captures conventions and the planned surface; update it
whenever an endpoint is added, changed or removed.

## Conventions

- REST + JSON. URLs are kebab-case plural nouns (`/training-sessions`).
- Auth: `Authorization: Bearer <jwt>`; refresh tokens via `/auth/refresh`.
- Pagination: `?limit=<n>&cursor=<id>`; responses include `nextCursor`.
- Filtering: documented per resource. Time ranges as ISO 8601.
- Errors: `{ error: { code, message?, details? } }`. `code` is stable.
- DTOs validated with Zod schemas exported from `@snooker/shared`.
- Body validation is attached directly to `@Body(new ZodValidationPipe(...))`,
  not method-wide, so route params and request metadata are not parsed as DTOs.
- Rate limiting is global (`120/min`) with tighter auth endpoint throttles:
  register `5/min`, login `10/min`, refresh `20/min`.
- Write endpoints that can double-submit (drill attempts, match shots) should
  be idempotency-keyed via `Idempotency-Key`; a shared middleware remains a
  PH-2 hardening item.

## Implemented

| Method | Path | Auth | DTO | Notes |
| --- | --- | --- | --- | --- |
| GET | `/health` | – | – | Liveness probe |
| POST | `/auth/register` | – | `RegisterSchema` | Returns `AuthSession`. First user gets `PLAYER` role. |
| POST | `/auth/login` | – | `LoginSchema` | Returns `AuthSession`. |
| POST | `/auth/refresh` | – | `RefreshSchema` | Returns `Tokens`. Rotates the refresh token (old one revoked). |
| POST | `/auth/logout` | – | `RefreshSchema` | 204. Revokes the refresh token. |
| GET | `/auth/me` | Bearer | – | Returns `AuthMe`. |
| GET | `/players/me/profile` | Bearer | – | Returns current user's `PlayerProfile` or `null`. |
| PUT | `/players/me/profile` | Bearer | `UpsertPlayerProfileSchema` | Creates or updates current user's player profile. |
| GET | `/players/me/equipment-profiles` | Bearer | – | Lists current player's equipment profiles, newest active first. |
| POST | `/players/me/equipment-profiles` | Bearer | `CreateEquipmentProfileSchema` | Creates an equipment profile for the current player profile. |
| PATCH | `/players/me/equipment-profiles/:id` | Bearer | `UpdateEquipmentProfileSchema` | Updates one equipment profile owned by the current player profile. |
| DELETE | `/players/me/equipment-profiles/:id` | Bearer | – | 204. Deletes one equipment profile owned by the current player profile. |
| GET | `/players/me/dashboard` | Bearer | `PlayerDashboardSchema` | Returns current-player 28-day dashboard aggregates: totals, weekly volume, drill success progress and recent sessions. Empty aggregates are returned when the player profile does not exist yet. |
| GET | `/drill-templates` | Bearer | – | Lists templates visible to the current user (own, shared, system). |
| GET | `/drill-templates/:id` | Bearer | – | Returns one visible drill template. |
| POST | `/drill-templates` | Bearer | `CreateDrillTemplateSchema` | Creates a user-owned template. User DTO allows `private` or `shared` visibility only. |
| PATCH | `/drill-templates/:id` | Bearer | `UpdateDrillTemplateSchema` | Updates a template owned by the current user. System templates are immutable via this API. |
| DELETE | `/drill-templates/:id` | Bearer | – | 204. Deletes a template owned by the current user. |
| GET | `/training-sessions` | Bearer | – | Lists the current player's latest 50 training sessions with drill executions and attempts. |
| GET | `/training-sessions/:id` | Bearer | – | Returns one current-player training session. |
| POST | `/training-sessions` | Bearer | `CreateTrainingSessionSchema` | Creates a session for the current user's player profile. |
| PATCH | `/training-sessions/:id` | Bearer | `UpdateTrainingSessionSchema` | Updates current-player session metadata and optional end time. |
| POST | `/training-sessions/:id/finish` | Bearer | `FinishTrainingSessionSchema` | Sets `endedAt` and optional post-session fatigue/notes. |
| POST | `/training-sessions/:id/drills` | Bearer | `AddDrillExecutionSchema` | Adds a visible drill template to an open current-player session and snapshots its table layout. |
| POST | `/drill-executions/:id/attempts` | Bearer | `CreateDrillAttemptSchema` | Appends the next numbered attempt to an open execution and increments counters. |
| PATCH | `/drill-executions/:id/finish` | Bearer | `FinishDrillExecutionSchema` | Sets `endedAt` and optional result summary fields. Repeated calls return the finished execution. |
| GET | `/matches` | Bearer | – | Lists the current player's latest 50 matches with frames. Returns an empty list if the player profile does not exist yet. |
| GET | `/matches/:id` | Bearer | – | Returns one current-player match with frames. |
| POST | `/matches` | Bearer | `CreateMatchSchema` | Creates a manual current-player match with opponent, score, location, break and key-stat fields. |
| PATCH | `/matches/:id` | Bearer | `UpdateMatchSchema` | Updates manual match metadata, score and key stats for a current-player match. |
| POST | `/matches/:id/frames` | Bearer | `AddMatchFrameSchema` | Adds one frame to a current-player match and recalculates frame score/result from saved frames. |

Schemas live in `packages/shared/src/schemas/auth.ts` and
`packages/shared/src/schemas/player.ts` and
`packages/shared/src/schemas/dashboard.ts` and
`packages/shared/src/schemas/drill.ts` and
`packages/shared/src/schemas/match.ts` and
`packages/shared/src/schemas/training.ts`.
Error codes returned by auth endpoints are defined in
`packages/shared/src/errors/codes.ts` under `ErrorCodes.Auth.*` and must be
translated by the web under `errors.api.<code>`.

## Planned (per TZ §14)

Auth, players, coaches, training-sessions, drill-templates,
drill-executions, matches, frames, shots, calendar-events,
lifestyle-factors, supplement-events, equipment-profiles, ai/*,
external-sources, external-import-jobs, attachments.

Each added endpoint must update the table above with method, path,
auth requirement and link to its DTO schema in `packages/shared`.
