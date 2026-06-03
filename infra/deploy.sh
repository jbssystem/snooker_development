#!/usr/bin/env bash
# Build and (re)start the production stack on the server.
#
# Invoked by the autodeploy poller (infra/autodeploy-poll.sh) right after it
# fetches a new commit on main, and safe to run by hand for a manual deploy:
#
#   cd /var/www/snooker_development && bash infra/deploy.sh
#
# Uses .env.deploy (the real production secrets file that lives only on the
# server) for both build args and runtime env. Never reads the local .env,
# which holds development placeholders.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE=".env.deploy"
if [ ! -f "$ENV_FILE" ]; then
	echo "missing $ENV_FILE — create it from .env.production.example with real secrets" >&2
	exit 1
fi

COMPOSE=(docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml)

echo "==> building images"
"${COMPOSE[@]}" build

echo "==> starting datastores"
"${COMPOSE[@]}" up -d postgres redis minio

echo "==> applying database migrations"
"${COMPOSE[@]}" run --rm migrate

echo "==> starting application services"
"${COMPOSE[@]}" up -d

echo "==> health check"
bind="$(grep -E '^APP_HTTP_BIND=' "$ENV_FILE" | cut -d= -f2 || true)"
health_url="http://${bind:-127.0.0.1:3300}/health"
for _ in $(seq 1 30); do
	if curl -fsS "$health_url" >/dev/null 2>&1; then
		echo "health OK ($health_url)"
		"${COMPOSE[@]}" ps
		exit 0
	fi
	sleep 2
done

echo "health check FAILED ($health_url)" >&2
"${COMPOSE[@]}" ps
exit 1
