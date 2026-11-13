#!/usr/bin/env bash
# Daily backup of the database and the test files. The last 14 days stay on this
# server, and when BACKUP_S3_* is set in .env each day is also copied to a bucket
# (Cloudflare R2) and kept there for 30 days. Without that copy the backups are
# lost together with the server.
# On the server, from the repository root, add to crontab (crontab -e):
#   0 4 * * * cd /root/YZU-judge && bash deploy/backup.sh >> /var/log/yzu-backup.log 2>&1
#
# bash deploy/backup.sh --offsite-only   copies today's files again without a new dump.
#
# Restoring on a fresh server, with .env filled in and nothing started yet (DATE as in
# the file names; get the two files back into backups/ first):
#   C="docker compose -f docker-compose.prod.yml"
#   $C up -d db
#   gunzip -c backups/db-DATE.sql.gz | $C exec -T db psql -q -U yzu -d yzu_judge
#   $C run --rm --no-deps -v "$PWD/backups:/backups:ro" --entrypoint sh api \
#       -c "tar -xzf /backups/test_data-DATE.tar.gz -C /data"
#   $C up -d --build
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
DIR="backups"
STAMP="$(date +%Y-%m-%d)"
# Pinned, so a new rclone release cannot change how the nightly copy behaves.
RCLONE_IMAGE="rclone/rclone:1.75.2"
OFFSITE_DAYS=30
mkdir -p "$DIR"

if [ "${1:-}" != "--offsite-only" ]; then
    $COMPOSE exec -T db pg_dump -U yzu -d yzu_judge | gzip > "$DIR/db-$STAMP.sql.gz"
    $COMPOSE run --rm --no-deps -v "$PWD/$DIR:/backups" --entrypoint sh api \
        -c "tar -czf /backups/test_data-$STAMP.tar.gz -C /data test_data"

    find "$DIR" -name "*.gz" -mtime +14 -delete
fi

# .env is not a shell file (EMAIL_FROM has spaces and <>), so single keys are read
# from it. A variable already set in the environment wins.
setting() {
    local value="${!1:-}"
    if [ -z "$value" ] && [ -f .env ]; then
        value="$(grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' || true)"
    fi
    printf '%s' "$value"
}

ENDPOINT="$(setting BACKUP_S3_ENDPOINT)"
BUCKET="$(setting BACKUP_S3_BUCKET)"

if [ -z "$ENDPOINT" ] || [ -z "$BUCKET" ]; then
    echo "$(date): backup $STAMP done, on this server only (BACKUP_S3_* is not set in .env)"
    exit 0
fi

# rclone reads its whole configuration from these, so no key is written to a file
# or shows up in the process list.
export RCLONE_CONFIG_OFFSITE_TYPE=s3
export RCLONE_CONFIG_OFFSITE_PROVIDER="$(setting BACKUP_S3_PROVIDER)"
export RCLONE_CONFIG_OFFSITE_PROVIDER="${RCLONE_CONFIG_OFFSITE_PROVIDER:-Cloudflare}"
export RCLONE_CONFIG_OFFSITE_REGION="$(setting BACKUP_S3_REGION)"
export RCLONE_CONFIG_OFFSITE_REGION="${RCLONE_CONFIG_OFFSITE_REGION:-auto}"
export RCLONE_CONFIG_OFFSITE_ENDPOINT="$ENDPOINT"
export RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="$(setting BACKUP_S3_ACCESS_KEY_ID)"
export RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="$(setting BACKUP_S3_SECRET_ACCESS_KEY)"
# A token limited to one bucket may not list or create buckets.
export RCLONE_CONFIG_OFFSITE_NO_CHECK_BUCKET=true

# The retry limits keep an unreachable bucket from holding the nightly job for long.
rclone() {
    docker run --rm \
        -e RCLONE_CONFIG_OFFSITE_TYPE -e RCLONE_CONFIG_OFFSITE_PROVIDER -e RCLONE_CONFIG_OFFSITE_REGION \
        -e RCLONE_CONFIG_OFFSITE_ENDPOINT -e RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID \
        -e RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY -e RCLONE_CONFIG_OFFSITE_NO_CHECK_BUCKET \
        -v "$PWD/$DIR:/backups:ro" "$RCLONE_IMAGE" "$@" \
        --quiet --retries 2 --low-level-retries 3 --contimeout 20s
}

fail() {
    echo "$(date): OFF-SITE COPY FAILED for $STAMP: $1" >&2
    exit 1
}

rclone copy /backups "offsite:$BUCKET" --include "*-$STAMP.*" || fail "upload"

# Listed back from the bucket, so "done" means the files are really there.
UPLOADED="$(rclone lsf "offsite:$BUCKET" --include "*-$STAMP.*" | wc -l | tr -d ' ')" || fail "listing the bucket"
[ "$UPLOADED" -ge 2 ] || fail "expected 2 files in the bucket, found $UPLOADED"

rclone delete "offsite:$BUCKET" --min-age "${OFFSITE_DAYS}d" || fail "removing old copies"

echo "$(date): backup $STAMP done, $UPLOADED files copied to $BUCKET"
