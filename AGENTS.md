# AGENTS.md — Snooker Player Development OS

Single source of truth for AI coding agents working on this repository.

## 1. Mission

Build a long-term CRM/ERP-style player development platform per
[docs/snooker_player_development_os_tz.md](docs/snooker_player_development_os_tz.md).
Treat the TZ as the product spec; this file is the engineering contract.

## 2. Repository layout

```
snooker_development/
  apps/
    web/         Next.js 15 (App Router) + TS strict, i18n (next-intl)
    api/         NestJS + Prisma + PostgreSQL
    worker/      BullMQ workers (AI jobs, imports, analytics)
  packages/
    shared/         Cross-cutting TS types, Zod schemas, constants
    snooker-domain/ Pure domain (TableLayout, BallPosition, ShotPath, scoring rules)
    ui/             Shared React components (renderer-agnostic primitives)
    ai-prompts/     Prompt templates (.md) consumed by api/worker
  infra/
    docker/      Dockerfiles per service
    nginx/       Reverse-proxy config
  docs/          Architecture, UI, API, DB, deployment, i18n
  docker-compose.yml
```

## 3. Non-negotiable rules

1. **TypeScript strict** in every package. No `any` without a `// reason:` comment.
2. **i18n-first**: every user-facing string passes through `next-intl`'s `t()`.
   All three locale files (`ru`, `en`, `uk`) must be updated together.
   `ru` is the default locale.
3. **Renderer isolation**: `packages/snooker-domain` MUST NOT import from
   `react-konva`, `pixi.js`, or any UI library. The renderer is an adapter
   that consumes domain types.
4. **Documentation updates** are part of the change, not optional:
   - DB schema → `docs/database-model.md`
   - HTTP API → `docs/api-spec.md`
   - UI patterns/components → `docs/ui-guidelines.md`
   - Architecture/dependencies → `docs/architecture.md`
   - Deployment/infra → `docs/deployment.md`
   - Brand / colors / logo → `docs/brand.md`
   - Phase boundary or scope change → append to `docs/development-log.md`
   - i18n keys → all three locale JSON files
   A PR that ships code without updating affected docs is incomplete.
5. **AI safety** (per TZ §13.5): never produce medical/supplement
   prescriptions; always wrap correlations with confidence + period.
6. **Wellness/supplement data is sensitive** — gated permission, audit log.
7. **Offline-first** for active training session entry path (IndexedDB queue).

## 4. Coding conventions

- Naming: `PascalCase` types/components, `camelCase` vars/functions,
  `kebab-case` files for non-component modules, `PascalCase.tsx` for components.
- React: server components by default; mark `"use client"` only when needed.
- Forms: React Hook Form + Zod (schemas live in `packages/shared`).
- State: TanStack Query for server state, Zustand for local UI state.
- API: REST + OpenAPI; one controller per resource; DTOs validated with Zod
  (via `nestjs-zod`).
- Errors: throw typed domain errors; map at HTTP boundary.
- Tests: Vitest (unit), Playwright (e2e), Jest (NestJS default).
  Arrange-Act-Assert. Test names describe scenario.

## 5. Workflow per task

1. Read affected section of the TZ + existing code.
2. Make minimal change that satisfies the request.
3. Update docs in same change.
4. Update i18n message files in all 3 locales (if user-facing).
5. Add/update tests for non-trivial logic.
6. Run lint + typecheck before declaring done.

## 6. Commands (post-bootstrap)

```
pnpm install                       # root, installs all workspaces
pnpm --filter web dev              # Next.js dev
pnpm --filter api start:dev        # NestJS dev
pnpm --filter api prisma migrate dev
pnpm --filter worker dev
pnpm lint                          # all packages
pnpm typecheck
docker compose up -d               # full stack
```

## 7. When in doubt

- Prefer adding to `snooker-domain` over duplicating types.
- Prefer extending an existing component over creating a new one.
- Prefer a Prisma migration over ad-hoc SQL.
- If a decision is irreversible (schema rename, public API change), document
  the rationale in `docs/decisions/NNNN-title.md` (ADR style).

## 8. Forbidden

- Hardcoded strings in UI.
- Business logic in the canvas renderer.
- Bypassing Zod validation at API boundary.
- `pnpm install` of new deps without recording the reason in `docs/architecture.md`.
- Direct DB access from `apps/web` — always through `apps/api`.
