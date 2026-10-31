#!/usr/bin/env bash
# Packs the local problems, papers, tests and help into deploy/out/ for the server.
# Run from the repository root in Git Bash:
#   bash deploy/export_local.sh
# It uses the local PostgreSQL's pg_dump (set PG_DUMP to override the path).
#
# Accounts are kept so the admin can sign in; local submissions, mock exams and
# hint reveals are left behind, so the live site starts clean.
set -euo pipefail

OUT="deploy/out"
mkdir -p "$OUT"
# Windows Python needs C:\ paths, not Git Bash's /c/ ones.
export PG_DUMP="$(cygpath -w "${PG_DUMP:-$(ls /c/Program\ Files/PostgreSQL/*/bin/pg_dump.exe | sort -V | tail -1)}")"
export DUMP_FILE="$(cygpath -w "$PWD/$OUT/db.sql")"

cd backend
venv/Scripts/python.exe -m scripts.portable_test_data
# pg_dump gets DATABASE_URL straight from Python, so the password never reaches the shell.
venv/Scripts/python.exe -c "
import os, subprocess
from app.config import DATABASE_URL
skip = ['submission_result', 'submissions', 'mock_exams', 'hint_reveals']
with open(os.environ['DUMP_FILE'], 'wb') as out:
    subprocess.run([os.environ['PG_DUMP'], '--dbname', DATABASE_URL, '--no-owner', '--no-privileges',
                    *[f'--exclude-table-data={table}' for table in skip]], stdout = out, check = True)"
cd ..

tar -czf "$OUT/test_data.tar.gz" -C backend test_data

ls -lh "$OUT"
echo "Copy deploy/out to the server, then run deploy/import_on_server.sh there."
