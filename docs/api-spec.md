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
- All write endpoints idempotency-keyed via `Idempotency-Key` header
  when an action could double-submit (drill attempts, match shots).

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

Schemas live in `packages/shared/src/schemas/auth.ts` and
`packages/shared/src/schemas/player.ts`.
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
