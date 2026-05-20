# Agent Guidelines

Authoritative file is [AGENTS.md](../AGENTS.md). This document is the
expanded version for human reviewers and onboarding.

## Working in small bounded tasks

Per TZ §19.3, each task should be small enough to:

- complete in a single change set,
- include the relevant doc updates,
- include the i18n keys in all three locales,
- include tests for non-trivial logic.

## Definition of done

A task is done when:

1. Code compiles, `pnpm typecheck` passes, `pnpm lint` is clean.
2. Affected docs under `docs/` are updated in the same change.
3. i18n keys added to **all** three locale files.
4. Tests cover the happy path and at least one error case for non-trivial
   logic.
5. Commit message follows the org template
   (`ISSUE-NUMBER ISSUE-NAME. SHORT-TITLE`).

## Boundaries to respect

- `packages/snooker-domain` is pure TS.
- `apps/web` never talks to the database directly.
- `apps/api` is the only writer to Prisma.
- Long-running work belongs in `apps/worker`.

## Adding a feature — recipe

1. Read the matching TZ section.
2. Add/extend domain types in `packages/snooker-domain` if needed.
3. Add Zod DTO in `packages/shared/src/schemas`.
4. Add Prisma model + migration + update `docs/database-model.md`.
5. Add NestJS module (controller + service) under `apps/api/src/modules`.
6. Update `docs/api-spec.md` with the new endpoints.
7. Add web pages/components under `apps/web/src/app/[locale]/…`.
8. Add i18n keys to all locales.
9. Add tests.
10. Update `docs/ui-guidelines.md` if a new pattern was introduced.
