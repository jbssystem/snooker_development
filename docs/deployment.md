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
The web app sets its own headers too (`next.config.ts` → `securityHeaders`):
a CSP (with `frame-ancestors 'none'` and a `connect-src` allowlist of `'self'`
+ the API origin), `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a permissions policy, and
HSTS in production. This matters because the SPA holds a short-lived access
token in `localStorage`, so clickjacking and XSS exfiltration are the realistic
browser-side threats to player data. In prod the API is same-origin (`/api`),
so `connect-src 'self'` already covers it; dev also allows `ws:`/`'unsafe-eval'`
for Fast Refresh. Don't strip these at nginx.

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

**Pre-deploy snapshot.** `infra/deploy.sh` runs `pg_dump` right before
applying migrations, on every deploy. If the dump fails the deploy aborts
before the schema is touched, so the DB is never migrated without a fresh
backup. Dumps are gzipped to `~/snooker-backups/snooker-<timestamp>.sql.gz`
(outside the repo, so `git clean` can't remove them) and the most recent 14
are kept (`BACKUP_KEEP`, `BACKUP_DIR` override the defaults).

Restore a dump into the running stack:
```bash
gunzip -c ~/snooker-backups/snooker-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose --env-file .env.deploy -f docker-compose.prod.yml \
      exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Still open: off-host copies (these dumps live on the same server as the DB).
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

## Production target

There is a single production host and we deploy only there for the
foreseeable future:

- Host: `81.16.28.222`, SSH on port `22022`, login `vadim` (in the `docker`
  group, so Docker needs no sudo).
- Repo checkout: `/var/www/snooker_development`, Compose project `snooker`.
- App nginx is bound to `127.0.0.1:3311`; a host nginx terminates TLS for
  `https://snooker.appshub.pl` and proxies to it.
- Secrets live in `/var/www/snooker_development/.env.deploy` (NOT `.env`,
  which holds dev placeholders). `.env.deploy` is gitignored and must never be
  committed. All Compose commands pass `--env-file .env.deploy`.

## Autodeploy (push to main → server rebuild)

The server auto-deploys whenever `main` is updated, via a once-a-minute
poller in `vadim`'s crontab — no GitHub Actions runner or inbound ports.

Pieces:
- `infra/deploy.sh` — builds images, runs migrations and restarts the stack
  with `--env-file .env.deploy`, then health-checks `/health`. Versioned in
  the repo, so changing the deploy steps ships with a normal commit.
- `infra/autodeploy-poll.sh` — versioned source of the poller. A copy is
  installed outside the repo at `/home/vadim/snooker-autodeploy.sh` so a
  `git reset --hard` mid-deploy can't rewrite the running script. It fetches
  `origin/main`; if HEAD differs it resets the working tree and runs
  `infra/deploy.sh`. A `flock` guard makes overlapping ticks a no-op.
- The server authenticates to the private repo with a read-only **deploy
  key** at `~/.ssh/snooker_deploy` (git remote uses the SSH URL).

One-time server setup (already done; documented for rebuilds):
```bash
# read-only deploy key, add the .pub to GitHub repo → Settings → Deploy keys
ssh-keygen -t ed25519 -f ~/.ssh/snooker_deploy -N "" -C "snooker-autodeploy"
ssh-keyscan github.com >> ~/.ssh/known_hosts

cd /var/www/snooker_development
git init -q
git remote add origin git@github.com:jbssystem/snooker_development.git
export GIT_SSH_COMMAND="ssh -i ~/.ssh/snooker_deploy -o IdentitiesOnly=yes"
git fetch origin main
git checkout -f -B main origin/main      # overwrites tracked files; .env* kept
git clean -fd -e .env -e .env.deploy

cp infra/autodeploy-poll.sh ~/snooker-autodeploy.sh
chmod +x ~/snooker-autodeploy.sh
( crontab -l 2>/dev/null; \
  echo "* * * * * /home/vadim/snooker-autodeploy.sh >> /home/vadim/snooker-autodeploy.log 2>&1" ) | crontab -
```

Logs: `/home/vadim/snooker-autodeploy.log`. Force a deploy immediately
instead of waiting for the next minute: `~/snooker-autodeploy.sh`. Deploy a
specific state by pushing it to `main`.

## Manual deploy (fallback)

From the server checkout, run the same script the poller uses:
```bash
cd /var/www/snooker_development
git fetch origin main && git reset --hard origin/main
bash infra/deploy.sh
```

The older archive-based flow (`git archive` → `scp` → `tar` →
`docker compose ... build/up`) still works if git access is unavailable, but
the autodeploy path above is the supported one.

Do not commit `docker-compose.override.yml`; it lives on the server and
controls port bindings behind the host nginx.
