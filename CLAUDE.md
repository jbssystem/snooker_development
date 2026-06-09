# Snooker Player OS — Claude Context

**Monorepo:** `snooker-player-os` · pnpm 9 workspaces · Node ≥20.11 · TypeScript 5.6

## Apps

| App | Stack | Port |
|-----|-------|------|
| `apps/web` | Next.js 15 App Router, next-intl, Tailwind, react-konva, TanStack Query, Zustand | 3000 |
| `apps/api` | NestJS 11, Prisma 5, Zod, BullMQ, Swagger at `/docs` | 4000 |
| `apps/worker` | BullMQ + ioredis — AI summaries, external data imports, analytics rollups | — |

## Packages

| Package | Purpose |
|---------|---------|
| `@snooker/snooker-domain` | Pure TS domain types & constants (table, balls, drills, scoring). **No framework deps.** |
| `@snooker/shared` | Cross-cutting Zod DTOs + locale constants. Imports: zod, snooker-domain. |
| `@snooker/ui` | Reusable React primitives (renderer-agnostic) |
| `@snooker/ai-prompts` | LLM prompt templates |

`snooker-domain` is the **purity boundary** — never import React/Prisma/NestJS there.

## API modules

`auth` · `profiles` · `players` · `training` · `drills` · `dashboard` · `matches` · `calendar` · `ai` · `external-sources` · `admin` · `announcements` · `audit`

## Database (PostgreSQL via Prisma)

Main models: `User`, `Role`, `Profile`, `Drill`, `DrillAttempt`, `TrainingSession`, `Match`, `Frame`, `CalendarEvent`, `AiReport`, `ImportJob`, `Announcement`

Key enums: `RoleType` (PLAYER/COACH/PARENT/ACADEMY_ADMIN/SYSTEM_ADMIN), `DrillCategory`, `DrillDifficulty`, `DrillVisibility`, `TrainingSessionType`, `MatchResult`, `AiReportType`, `AiReportStatus`, `ExternalSource` (WST/CUETRACKER)

## Auth design

- Access token: short-lived JWT, stored in Zustand/localStorage
- Refresh token: httpOnly cookie scoped to `/auth`, managed by API
- Web client auto-refreshes on 401 (one retry)

## i18n

`next-intl` — locales: **ru** (default), **en**, **uk**. Route prefix: `[locale]`.

## Local dev

```powershell
# Start datastores only
docker compose up -d postgres redis minio

# Run apps separately
pnpm dev:api    # NestJS with watch
pnpm dev:web    # Next.js :3000
pnpm dev:worker

# Or full stack via Docker
docker compose up -d --build
```

Env: copy `.env.example` → `.env`.

## Common commands

```powershell
pnpm -r typecheck          # typecheck all workspaces
pnpm -r lint               # lint all (ESLint flat config at repo root)
pnpm -r test               # jest (api) + vitest (snooker-domain)
pnpm --filter @snooker/api prisma:migrate   # create migration
pnpm seed:demo             # seed demo profile
pnpm test:ui               # Playwright smoke
pnpm test:ui:e2e           # Playwright e2e (4 workers)
```

## Production

- **Host:** `81.16.28.222`, SSH port `22022`, user `vadim`
- **Repo:** `/var/www/snooker_development`, Compose project `snooker`
- **URL:** `https://snooker.appshub.pl` — nginx proxy to `127.0.0.1:3311`
- **Secrets:** `.env.deploy` on server (gitignored, never commit)
- **Deploy:** push to `main` → server cron poller picks it up within 1 min
  - Manual: `ssh -p 22022 vadim@81.16.28.222 "cd /var/www/snooker_development && bash infra/deploy.sh"`
  - Logs: `/home/vadim/snooker-autodeploy.log`
- **Prod compose:** `docker-compose.prod.yml` with `--env-file .env.deploy`
- **DB backups:** auto-snapshot before each deploy to `~/snooker-backups/`, 14 retained
- `NEXT_PUBLIC_API_URL=/api` and `AUTH_REFRESH_COOKIE_PATH=/api/auth` in prod (same-origin via nginx)

## Key architecture rules

1. No domain logic inside canvas components (react-konva is a thin adapter)
2. Zod schemas live in `@snooker/shared`; NestJS uses the in-house `ZodValidationPipe`
3. Single ESLint config at root (`eslint.config.mjs`); `apps/web` lints with ESLint CLI (not `next lint`)
4. `pnpm -r build` order: shared → snooker-domain → app

## Docs

`docs/architecture.md` · `docs/deployment.md` · `docs/api-spec.md` · `docs/database-model.md` · `docs/ai-spec.md` · `docs/ui-guidelines.md` · `docs/i18n.md` · `docs/decisions/`

---
*Update this file when: new app/package added, major infra change, auth or deploy flow changes.*
