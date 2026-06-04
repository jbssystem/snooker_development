# UI tests (Playwright)

Fast UI safety net for the `apps/web` Next.js app. Two modes:

| Project | Backend | Auth | Speed | Command |
| ------- | ------- | ---- | ----- | ------- |
| `smoke` (default) | **Mocked** (no Postgres/Redis/API needed) | Seeded "remembered" admin session (refresh-on-load mocked) | Seconds | `pnpm test:ui` |
| `e2e` | **Real** API on `:4000` | Per-worker real login (env creds) | Slower | `pnpm test:ui:e2e` |

## Запуск «по промту»

> Когда нужно прогнать UI-тесты — выполняется **`pnpm test:ui`** (быстрый smoke-набор, бэкенд не нужен).

## First-time setup

```bash
pnpm install
npx playwright install chromium
```

## Commands

```bash
pnpm test:ui          # smoke (mocked) — the default fast run
pnpm test:ui:headed   # smoke with a visible browser
pnpm test:ui:debug    # smoke in the Playwright UI runner
pnpm test:ui:report   # open the last HTML report
pnpm test:ui:e2e      # full e2e against a running API (needs the stack + seed:demo)
```

The web dev server (`pnpm dev:web`, port 3000) starts automatically and is
reused if already running.

## How it works

- **`support/auth.ts`** — (smoke) seeds only the remembered `user` summary into
  `localStorage` (`snooker.auth`) before the page loads. The access token is
  **not** persisted (it's in-memory only), so on load `AuthGuard` calls
  `/auth/refresh` to mint one — mocked to `fx.authTokens` for `smoke`.
- **`support/session.ts`** — (e2e) real `/auth/login` helper. Because the refresh
  token is single-use, `test-base.ts` logs in **once per worker** and shares one
  browser context across that worker's tests, so refresh-on-load rotation chains
  forward instead of being replayed across isolated contexts. `pnpm test:ui:e2e`
  caps `--workers` to stay under the `/auth/login` rate limit.
- **`support/mockApi.ts`** + **`support/fixtures.ts`** — intercept every request
  to `http://localhost:4000/**` and answer with static fixtures. Unknown GETs
  default to `[]` so a page never crashes on a missing mock.
- **`support/test-base.ts`** — extends Playwright `test`: auto-applies mocks +
  auth per project, and exposes a `consoleErrors` collector. Use
  `test.use({ auth: false })` for public pages (login/register).

## Tests

- **`smoke/pages.spec.ts`** — every main route renders a heading, shows its
  title, and logs no console/page errors. The core "did anything break" check.
- **`flows/drills.spec.ts`** — open the new-drill modal; toggle filter chips.
- **`flows/admin.spec.ts`** — admin tab navigation.

## Adding coverage

- New page → add a `{ path, title }` row in `smoke/pages.spec.ts`.
- New API endpoint a page needs → add a fixture in `fixtures.ts` and map it in
  `mockApi.ts`.
- New interaction → add a spec under `flows/`.
