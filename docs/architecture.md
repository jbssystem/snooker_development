# Architecture

Status: living document. Update with every change that introduces a new
package, dependency, service or boundary.

## High-level

```
┌────────────────────┐     HTTPS      ┌──────────────────┐
│  Browser / PWA     │ ─────────────▶ │  nginx (80/443)  │
└────────────────────┘                └────────┬─────────┘
                                               │
                ┌──────────────────────────────┼─────────────────┐
                ▼                              ▼                 ▼
        ┌──────────────┐              ┌──────────────┐   ┌──────────────┐
        │  apps/web    │  REST/HTTP   │  apps/api    │   │  apps/worker │
        │  Next.js 15  │ ───────────▶ │  NestJS      │   │  BullMQ      │
        └──────────────┘              └──┬───────────┘   └────┬─────────┘
                                         │                    │
                              ┌──────────┼────────────────────┼──────────┐
                              ▼          ▼          ▼          ▼          ▼
                          Postgres    Redis     MinIO/S3   LLM API    External
                                                                       APIs
```

## Apps

| App | Stack | Responsibility |
| --- | --- | --- |
| `apps/web` | Next.js 15, App Router, next-intl, Tailwind, react-konva | All UI (PWA-capable). Server components for data fetching; client components for interactivity (table editor, drill execution). |
| `apps/api` | NestJS 11, Prisma, Zod | Sole gateway to the database. Auth, REST endpoints, OpenAPI at `/docs`, queues fan-out. |
| `apps/worker` | BullMQ + ioredis | Background jobs: AI summary generation, external data imports, analytics rollups, file post-processing. |

## Packages

| Package | Purpose | May import |
| --- | --- | --- |
| `@snooker/snooker-domain` | Pure TS domain types & constants (table, balls, drills, scoring) | nothing UI/framework specific |
| `@snooker/shared` | Cross-cutting types + Zod schemas (DTOs) + locale constants | zod, snooker-domain |
| `@snooker/ui` | Reusable React primitives (renderer-agnostic) | react, snooker-domain |
| `@snooker/ai-prompts` | LLM prompt templates and loader | none |

`snooker-domain` is the **purity boundary** — it MUST NOT import from React,
canvas libraries, Prisma, or NestJS. Renderers are thin adapters living in
`apps/web` (and later `packages/ui`) that consume domain types.

## Data flow

1. User action in `apps/web` → React Hook Form + Zod (shared schema) →
   fetch to `apps/api`.
2. `apps/api` validates DTO with the same Zod schema, persists via Prisma,
   enqueues follow-up jobs in Redis if needed.
3. `apps/worker` consumes queues, calls LLM/external APIs, writes results
   back via Prisma.
4. Web re-fetches via TanStack Query (or revalidates RSC).

Auth state is split deliberately: the browser stores only the current user
summary and short-lived access token in Zustand/localStorage. The refresh token
is an API-managed httpOnly cookie scoped to `/auth`; the web API client refreshes
the access token once on authenticated 401 responses.

## Renderer strategy

- **MVP:** react-konva 2D canvas inside `apps/web`. Pure functions take a
  `TableLayout` and return Konva elements. Interaction events emit
  domain-level updates back to the caller.
- **Phase 5:** PixiJS for animation/replay. Same `TableLayout` interface;
  swap the adapter only.

Forbidden: putting domain logic (scoring, validation, drill rules) inside
canvas components.

## Dependencies of note

- `next-intl` — i18n (ru default, en, uk).
- `react-konva` / `konva` — MVP table renderer.
- `prisma` — DB ORM.
- `bullmq` — job queues over Redis.
- In-house Zod pipe — validates shared Zod schemas at NestJS body boundaries
  without making `@snooker/shared` framework-specific.
- `recharts` — analytics charts (swappable for ECharts later).
- `playwright` (root devDependency) — visual QA tooling for design review.
  `scripts/ui-screenshots.mjs` logs in with the demo account and captures key
  pages at desktop/mobile widths into `.ui-shots/` (git-ignored);
  `scripts/ui-inspect.mjs` captures focused element shots. Not part of the app
  bundle or CI yet.
- `vitest` (`@snooker/snooker-domain` devDependency) — unit tests for the pure
  snooker scoring engine (`src/scoring/`), per the AGENTS.md testing contract.
  Domain-only; not bundled into any app.

Add a new dependency only with a one-line rationale in this section.

## Linting

A single flat ESLint config at the repo root (`eslint.config.mjs`) serves every
workspace. Each package's `lint` script runs `eslint` from its own directory and
ESLint walks up to the shared config. `typescript-eslint/recommended` applies to
all `.ts`/`.tsx`; the `next/core-web-vitals` ruleset is scoped to `apps/web` via
`files`. `apps/web` lints with the ESLint CLI directly (not the deprecated
`next lint`). Run `pnpm lint` from the root.

## Environments

- Local: `docker compose up -d` brings web/api/worker/postgres/redis/minio/nginx.
- Local dev (no Docker): run each `pnpm dev:*` script, plus postgres/redis from Docker.
- Production: `docker-compose.prod.yml` builds standalone web/api/worker
  images, runs postgres/redis/minio on the private Compose network and exposes
  only the app nginx service on `APP_HTTP_BIND` (`127.0.0.1:3300` by default)
  for host-nginx TLS termination at `snooker.appshub.pl`.

## Open architecture decisions

Tracked under `docs/decisions/`. Use ADR-style files for irreversible choices.
