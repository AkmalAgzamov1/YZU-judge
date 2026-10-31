#!/usr/bin/env bash
# Daily backup of the database and the test files, keeping the last 14 days.
# On the server, from the repository root, add to crontab (crontab -e):
#   0 4 * * * cd /root/YZU-judge && bash deploy/backup.sh >> /var/log/yzu-backup.log 2>&1
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
DIR="backups"
STAMP="$(date +%Y-%m-%d)"
mkdir -p "$DIR"

$COMPOSE exec -T db pg_dump -U yzu -d yzu_judge | gzip > "$DIR/db-$STAMP.sql.gz"
$COMPOSE run --rm --no-deps -v "$PWD/$DIR:/backups" --entrypoint sh api \
    -c "tar -czf /backups/test_data-$STAMP.tar.gz -C /data test_data"

find "$DIR" -name "*.gz" -mtime +14 -delete
echo "$(date): backup $STAMP done"
