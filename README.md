# Snooker Player Development OS

Long-term CRM/ERP-style platform for tracking professional snooker player
development across drills, sessions, matches, coaches and wellness factors.

Product spec: [docs/snooker_player_development_os_tz.md](docs/snooker_player_development_os_tz.md)
Engineering contract: [AGENTS.md](AGENTS.md)
Architecture: [docs/architecture.md](docs/architecture.md)

## Quick start

```powershell
# 1. Install Node 20.11+ and pnpm 9.
#    Easiest on Windows + nvm:
npm install -g pnpm@9.12.0
#    (Or, in an elevated shell: corepack enable; corepack prepare pnpm@9.12.0 --activate)

# 2. Bootstrap
Copy-Item .env.example .env
pnpm install

# 3. Run via Docker (full stack)
docker compose up -d

# 3-alt. Run services locally
pnpm dev:api      # NestJS on :4000
pnpm dev:web      # Next.js on :3000
pnpm dev:worker
```

Brand & color tokens: [docs/brand.md](docs/brand.md).
Development journal: [docs/development-log.md](docs/development-log.md).

## Production deploy

Production is shipped with Docker Compose through
[docker-compose.prod.yml](docker-compose.prod.yml). The current domain is
`snooker.appshub.pl`; copy [.env.production.example](.env.production.example)
to `.env` on the server, replace secrets, run migrations with the `migrate`
service, then start the stack. Full steps live in
[docs/deployment.md](docs/deployment.md).

## Languages

UI is available in **ru** (default), **en**, **uk**.
See [docs/i18n.md](docs/i18n.md).

## Layout

```
apps/web        Next.js 15 PWA
apps/api        NestJS REST API
apps/worker     BullMQ workers
packages/shared          types & Zod schemas
packages/snooker-domain  pure domain (table, balls, scoring)
packages/ui              shared React primitives
packages/ai-prompts      LLM prompt templates
infra/                   Docker, nginx
docs/                    living architecture & specs
```
