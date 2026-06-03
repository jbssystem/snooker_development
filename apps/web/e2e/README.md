# UI tests (Playwright)

Fast UI safety net for the `apps/web` Next.js app. Two modes:

| Project | Backend | Auth | Speed | Command |
| ------- | ------- | ---- | ----- | ------- |
| `smoke` (default) | **Mocked** (no Postgres/Redis/API needed) | Fake seeded admin token | Seconds | `pnpm test:ui` |
| `e2e` | **Real** API on `:4000` | Real login (env creds) | Slower | `pnpm test:ui:e2e` |

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

- **`support/auth.ts`** — seeds a session into `localStorage` (`snooker.auth`)
  before the page loads. Route protection is client-side, so this is enough to
  render protected pages without the login flow. `e2e` does a real `/auth/login`.
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
