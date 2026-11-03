#!/usr/bin/env bash
# Runs every minute on the server (deploy/install_auto_deploy.sh sets that up).
# When GitHub's main has new commits, it pulls them, rebuilds what changed and,
# if the statements or the hints changed, writes them into the database.
# A change to scripts/repair_test_inputs.py runs that repair on the test files.
# Nothing happens when main is unchanged, so most runs exit in a second.
set -euo pipefail

cd "$(dirname "$0")/.."
exec 9> /tmp/yzu-auto-deploy.lock
flock -n 9 || exit 0  # the previous deploy is still running

git fetch -q origin main
OLD="$(git rev-parse HEAD)"
NEW="$(git rev-parse origin/main)"
[ "$OLD" = "$NEW" ] && exit 0

echo "$(date -u +%FT%TZ) deploying ${OLD:0:7} -> ${NEW:0:7}"
git merge -q --ff-only origin/main

CHANGED="$(git diff --name-only "$OLD" "$NEW")"
# Docs alone change nothing that runs, so leave the containers (and running judgments) alone.
if ! grep -qv '\.md$' <<< "$CHANGED"; then
    echo "$(date -u +%FT%TZ) only docs changed, nothing to rebuild"
    exit 0
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
$COMPOSE up -d --build --remove-orphans

if grep -q "^backend/scripts/cpe_content.json$" <<< "$CHANGED"; then
    $COMPOSE exec -T api python -m scripts.cpe_content apply
fi
if grep -q "^backend/scripts/cpe_help.json$" <<< "$CHANGED"; then
    # Refuses code that changed since the judge accepted it.
    $COMPOSE exec -T api python -m scripts.cpe_help apply
fi
if grep -q "^backend/scripts/repair_test_inputs.py$" <<< "$CHANGED"; then
    # Runs official solutions, so it needs the worker's Docker. Safe to run again.
    $COMPOSE exec -T worker python -m scripts.repair_test_inputs || echo "test repair left some problems alone"
fi

docker image prune -f > /dev/null
echo "$(date -u +%FT%TZ) deployed ${NEW:0:7}"
