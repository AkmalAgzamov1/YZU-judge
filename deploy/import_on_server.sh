#!/usr/bin/env bash
# Loads deploy/out/ (from export_local.sh) into a fresh server. Run once, from the
# repository root on the server, after filling in .env:
#   bash deploy/import_on_server.sh
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
OUT="deploy/out"

$COMPOSE up -d db
until $COMPOSE exec -T db pg_isready -U yzu -d yzu_judge > /dev/null; do sleep 1; done

if [ "$($COMPOSE exec -T db psql -U yzu -d yzu_judge -tAc "select to_regclass('public.problems') is not null")" = "t" ]; then
    echo "The database already has tables. Refusing to load over them." >&2
    exit 1
fi

$COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -q -U yzu -d yzu_judge < "$OUT/db.sql"

# The tarball holds a test_data/ folder; the volume is mounted at /data/test_data.
$COMPOSE run --rm --no-deps -v "$PWD/$OUT/test_data.tar.gz:/tmp/test_data.tar.gz:ro" \
    --entrypoint sh api -c "tar -xzf /tmp/test_data.tar.gz -C /data"

$COMPOSE up -d --build
echo "Done. Problems: $($COMPOSE exec -T db psql -U yzu -d yzu_judge -tAc 'select count(*) from problems')"
