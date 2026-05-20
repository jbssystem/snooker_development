# Deployment

## Local development

Prerequisites: Node 20.11+, pnpm 9, Docker Desktop.

```powershell
corepack enable
corepack prepare pnpm@9.12.0 --activate
cp .env.example .env
pnpm install
docker compose up -d postgres redis minio
pnpm dev:api
pnpm dev:web
```

Or full stack via Docker:
```powershell
docker compose up -d --build
```

The web app is reachable at `http://localhost` (via nginx) or
`http://localhost:3000` directly. The API exposes Swagger at
`http://localhost:4000/docs`.

## Environment variables

See `.env.example`. Anything secret must be set per environment and never
committed. `API_JWT_SECRET` and `API_JWT_REFRESH_SECRET` MUST be rotated
before any non-local deployment.

## Services

| Service | Port (host) | Persistence |
| --- | --- | --- |
| web | 3000 | stateless |
| api | 4000 | stateless |
| worker | – | stateless |
| postgres | 5432 | `postgres_data` volume |
| redis | – (internal) | `redis_data` volume |
| minio | 9000, 9001 | `minio_data` volume |
| nginx | 80 | config-only |

## Migrations

```powershell
pnpm --filter @snooker/api prisma:migrate
```

In Docker, migrations run as a one-shot from the api container:
```powershell
docker compose run --rm api pnpm prisma migrate deploy
```

## Backups (production)

Daily `pg_dump` to MinIO via worker cron job (added in Phase 1 close-out).
File backups: MinIO bucket replication. Document the schedule here once
configured.

## TLS

nginx terminates TLS in production. Use Let's Encrypt via certbot on the
host; mount certificates into the nginx container.

## Production deploy (template)

Per organization SSH-deploy convention (see user notes):
1. `git archive --format=tar.gz -o tmp.tar.gz HEAD`
2. `scp` to server target dir.
3. `tar -xzf` and `docker compose --env-file .env up -d --build`.
4. Run pending migrations: `docker compose run --rm api pnpm prisma migrate deploy`.

Do not commit `docker-compose.override.yml`; it lives on the server and
controls port bindings behind the host nginx.
