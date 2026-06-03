---
name: run-tests
description: Run the full Snooker Player OS test suite — ensure the backend stack is up, then run unit/integration tests (domain + API) and the web UI tests (mocked smoke + real-backend e2e). Use when the user asks to "run all tests", "прогони тесты", "запусти тесты", "run the suite", or wants a full QA pass before/after changes.
---

# Run all tests

Orchestrates a full test pass for the monorepo. Run the steps in order, from
the repo root (`C:\work\repos\snooker\snooker_development`). **Do not stop at
the first failure** — run every stage, then report a consolidated summary at
the end (✅/❌ per stage) and surface the failing output.

## Stage 0 — Ensure the backend stack is up

The web e2e tests and the API need Postgres (:5433), Redis (:6379) and the API
(:4000) running. They run in Docker.

```bash
docker compose up -d postgres redis api web
```

Then wait for the API to be healthy (poll, up to ~60s):

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health
```

Proceed once it returns `200`. If it never does, report the Docker logs
(`docker compose logs --tail=50 api`) and continue to the stages that don't
need the backend (domain tests + UI smoke), marking e2e as skipped.

## Stage 1 — Unit / integration tests (domain + API)

```bash
pnpm -r test
```

This runs `@snooker/snooker-domain` (vitest) and `@snooker/api` (jest).

## Stage 2 — Web UI smoke tests (mocked API, fast)

No backend needed; API is mocked. Playwright reuses the running web server on
:3000.

```bash
pnpm test:ui
```

## Stage 3 — Web UI e2e tests (real backend)

Hits the real API on :4000 and logs in with admin credentials. Requires
Stage 0 to be healthy. Uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the
environment (defaults to the dev admin) — set them if login fails.

```bash
pnpm test:ui:e2e
```

## Reporting

After all stages, print a summary table:

| Stage | Result |
| ----- | ------ |
| Backend stack | ✅ / ❌ |
| Unit (domain + API) | ✅ / ❌ |
| UI smoke | ✅ / ❌ |
| UI e2e | ✅ / ❌ / skipped |

On any failure, show the relevant failing output and remind the user that the
Playwright HTML report is available via `pnpm test:ui:report`.

## Notes

- Run from the repo root; the working directory is already set there.
- The Playwright web server is reused if already running (Docker `web` on :3000),
  so these tests don't spin up a second server.
- For a quick check without the backend, just run Stage 2 (`pnpm test:ui`).
- See [apps/web/e2e/README.md](../../../apps/web/e2e/README.md) for the UI test
  architecture.
