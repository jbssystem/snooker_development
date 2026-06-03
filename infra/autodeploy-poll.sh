#!/usr/bin/env bash
# Autodeploy poller — versioned source of the script installed on the server.
#
# A copy of this file is installed OUTSIDE the repo at
# /home/vadim/snooker-autodeploy.sh and run from the user crontab once a
# minute. It is intentionally not run directly from the repo so that a
# `git reset --hard` mid-deploy can never rewrite the script while bash is
# still reading it. When this logic changes, reinstall the server copy:
#
#   cp infra/autodeploy-poll.sh ~/snooker-autodeploy.sh && chmod +x ~/snooker-autodeploy.sh
#
# Behaviour: fetch origin/main; if it differs from the checked-out HEAD,
# reset the working tree to it and run infra/deploy.sh. A flock guard makes
# overlapping cron ticks (e.g. a slow build) a no-op instead of a double run.
set -euo pipefail

REPO="/var/www/snooker_development"
LOCK="/tmp/snooker-autodeploy.lock"
DEPLOY_KEY="$HOME/.ssh/snooker_deploy"

exec 9>"$LOCK"
flock -n 9 || exit 0   # a previous deploy is still running

export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o IdentitiesOnly=yes"
cd "$REPO"

git fetch --quiet origin main
local_rev="$(git rev-parse HEAD)"
remote_rev="$(git rev-parse origin/main)"
[ "$local_rev" = "$remote_rev" ] && exit 0

echo "===== $(date -Is) deploy ${local_rev:0:7} -> ${remote_rev:0:7} ====="
git reset --hard origin/main
# Drop stale tracked files removed upstream, but never the server secrets.
git clean -fd -e .env -e .env.deploy
bash infra/deploy.sh
echo "===== $(date -Is) deploy finished ====="
