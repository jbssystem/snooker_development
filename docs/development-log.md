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
- Table layout editing is a placeholder empty full-size layout until
  PH-1-006 introduces `SnookerTableCanvas`.

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

**Open items:**
- Refresh tokens are still kept in the PH-1 client-side Zustand store. This is
  tracked as a PH-2 hardening item: move refresh tokens to httpOnly cookies
  and add SSR-aware route protection.
- `pnpm audit --audit-level moderate` currently reports transitive dependency
  advisories (including Nest/Next/next-intl dependency trees). Most fixes imply
  coordinated major-version upgrades or overrides, so they are tracked as a
  dedicated dependency-hardening task instead of being mixed into PH-1-004.

### PH-1-003 — Player profile CRUD + equipment profile

**Delivered:**
- Prisma `EquipmentProfile` model and migration
  `20260520103808_add_equipment_profiles`.
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
  `auth.*`, `dashboard.placeholder`, `home.cta.{login,register}`,
  `errors.api.{auth,validation,generic}.*`.
- `docs/ui-guidelines.md` updated with the new layout primitives and
  auth-UI conventions.

**Open items:**
- Auth UI is fully client-rendered for MVP; no route protection at the
  middleware/server level yet. PH-2 will move refresh tokens into
  httpOnly cookies and add SSR-aware redirects.
- `pnpm install` must be re-run locally to pick up the new auth deps from
  PH-1-001 (`@nestjs/jwt`, `argon2`).

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
5. ⏳ PH-1-005 — Training session flow.
6. PH-1-006 — SnookerTableCanvas (react-konva).
7. PH-1-007 — Basic dashboard.
8. PH-1-008 — Manual match log.
9. PH-1-009 — Calendar factors.
10. PH-1-010 — Weekly AI summary (Anthropic).
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
- User to drop `logo.png`, `icon.png`, `apple-touch-icon.png`, `favicon.ico`,
  `icon-192.png`, `icon-512.png` into `apps/web/public/`.
- User to set `AI_API_KEY` in `.env` (already done locally, not committed).
- Issue prefix for Phase 0 commits: `PH-0`.

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
