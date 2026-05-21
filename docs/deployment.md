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

On Windows with nvm, `corepack enable` can fail with EPERM. In that case use
`npm install -g pnpm@9.12.0` and then run `pnpm install`.

Or full stack via Docker:
```powershell
docker compose up -d --build
```

The web app is reachable at `http://localhost` (via nginx) or
`http://localhost:3000` directly. The API exposes Swagger at
`http://localhost:4000/docs`.

## Environment variables

See `.env.example`. Anything secret must be set per environment and never
committed. `API_JWT_SECRET` MUST be rotated before any non-local deployment.
`CORS_ORIGINS` is a comma-separated allow-list; production disables CORS if
the allow-list is missing instead of accepting every origin.
Production starts from `.env.production.example`; copy it to `.env` on the
server and replace every placeholder secret before starting containers.
For `snooker.appshub.pl`, the web build uses `NEXT_PUBLIC_API_URL=/api` and
the API uses `AUTH_REFRESH_COOKIE_PATH=/api/auth` so the httpOnly refresh
cookie is sent to `/api/auth/refresh` and `/api/auth/logout`.
The API sets baseline security headers itself (`nosniff`, `DENY`, CSP,
`no-referrer`, permissions policy, and HSTS in production). Keep equivalent
nginx headers aligned rather than loosening them at the proxy.

## Services

| Service | Port (host) | Persistence |
| --- | --- | --- |
| web | 3000 | stateless |
| api | 4000 | stateless |
| worker | – | stateless |
| postgres | 5433 | `postgres_data` volume |
| redis | 6379 | `redis_data` volume |
| minio | 9000, 9001 | `minio_data` volume |
| nginx | 80 | config-only |

Inside Docker, `api` and `worker` override `DATABASE_URL` and `REDIS_URL` to
the internal service names (`postgres:5432`, `redis:6379`). Host-side local
development uses `localhost:5433` and `localhost:6379`.
AI report generation needs Redis only when `/ai/reports/generate` is called;
the normal API process can start without opening the AI queue connection.

Production uses `docker-compose.prod.yml`. Only the internal nginx service is
published, defaulting to `127.0.0.1:3300`; postgres, redis, minio, api and web
stay on the Docker network. A host nginx with Let's Encrypt should proxy
`https://snooker.appshub.pl` to `http://127.0.0.1:3300`.

## Migrations

```powershell
pnpm --filter @snooker/api prisma:migrate
```

For first-time setup against a fresh database, the initial migration SQL is
already committed under `apps/api/prisma/migrations/20260520120000_init/`,
so production servers can apply it with:

```powershell
pnpm --filter @snooker/api prisma generate
pnpm --filter @snooker/api exec prisma migrate deploy
```

In local Docker, run as a one-shot from the api container:
```powershell
docker compose run --rm api pnpm prisma migrate deploy
```

In production, use the dedicated one-shot service after database containers are
up and before exposing the new app version:

```powershell
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres redis minio
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d
```

## Backups (production)

Daily `pg_dump` to MinIO via worker cron job (added in Phase 1 close-out).
File backups: MinIO bucket replication. Document the schedule here once
configured.

## TLS

The committed app nginx config is HTTP-only and intended to sit behind a host
nginx that terminates TLS. Host nginx should own the Let's Encrypt certificate
for `snooker.appshub.pl` and proxy all traffic to `127.0.0.1:3300` unless
`APP_HTTP_BIND` is changed.

Example host nginx site:

```nginx
server {
	listen 80;
	server_name snooker.appshub.pl;
	return 301 https://$host$request_uri;
}

server {
	listen 443 ssl http2;
	server_name snooker.appshub.pl;

	location / {
		proxy_pass http://127.0.0.1:3300;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Host $host;
		proxy_set_header X-Forwarded-Proto https;
	}
}
```

## Production deploy (template)

Per organization SSH-deploy convention (see user notes):
1. `git archive --format=tar.gz -o tmp.tar.gz HEAD`
2. `scp` to server target dir.
3. `tar -xzf` into the server target dir.
4. Ensure server `.env` exists, based on `.env.production.example`, with real
	secrets and `PUBLIC_APP_URL=https://snooker.appshub.pl`.
5. `docker compose -f docker-compose.prod.yml build`.
6. `docker compose -f docker-compose.prod.yml up -d postgres redis minio`.
7. `docker compose -f docker-compose.prod.yml run --rm migrate`.
8. `docker compose -f docker-compose.prod.yml up -d`.
9. Check `curl -f http://127.0.0.1:3300/health` from the server and then
	`https://snooker.appshub.pl/ru/login` externally after TLS is configured.

Do not commit `docker-compose.override.yml`; it lives on the server and
controls port bindings behind the host nginx.
