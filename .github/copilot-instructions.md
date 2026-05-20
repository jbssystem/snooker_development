# Copilot Instructions — Snooker Player Development OS

Authoritative engineering contract is [AGENTS.md](../AGENTS.md). Read it first.
Product spec is [docs/snooker_player_development_os_tz.md](../docs/snooker_player_development_os_tz.md).

## Hard rules (repeat of the most-violated ones)

1. **i18n-first.** No literal user-facing strings in components.
   Use `useTranslations()` / `getTranslations()` (next-intl).
   Update `apps/web/messages/{ru,en,uk}.json` in the same change.
   Default locale is `ru`.
2. **Docs always follow code.** Edits to schema/API/UI/infra require
   the matching doc under `docs/` to be updated in the same change.
   Phase/scope changes get an entry in `docs/development-log.md`.
3. **Strict TypeScript** in every package; no implicit `any`.
4. **Renderer isolation.** `packages/snooker-domain` is pure TS — no React,
   no Konva, no Pixi imports.
5. **Server-first React.** Add `"use client"` only when interactivity demands it.
6. **REST + Zod DTOs** in NestJS. Validate at the boundary.
7. **Wellness/supplement data** is sensitive — separate permission & audit log.

## Stack quick reference

- Web: Next.js 15 App Router, Tailwind, shadcn/ui, next-intl, TanStack Query, Zustand, React Hook Form + Zod, Recharts, react-konva.
- API: NestJS, Prisma, PostgreSQL 16, Redis, BullMQ.
- Tests: Vitest, Playwright, Jest (Nest).
- Deploy: Docker Compose + nginx + MinIO.

## File placement cheat-sheet

| What | Where |
| --- | --- |
| Domain type (Ball, TableLayout, Shot) | `packages/snooker-domain/src` |
| Cross-app Zod schema / DTO | `packages/shared/src/schemas` |
| Reusable UI primitive | `packages/ui/src/components` |
| App-specific page | `apps/web/src/app/[locale]/...` |
| Prompt template | `packages/ai-prompts/prompts/*.md` |
| API resource | `apps/api/src/modules/<resource>/` |
| Background job | `apps/worker/src/jobs/` |
| ADR | `docs/decisions/NNNN-title.md` |

## Commit message format

Per organization rule:
```
ISSUE-NUMBER ISSUE-NAME. SHORT-TITLE

BODY (what & why, wrapped at 72 chars)
```
Ask for ISSUE-NUMBER / ISSUE-NAME if not supplied.
