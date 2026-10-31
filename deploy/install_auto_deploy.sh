#!/usr/bin/env bash
# One time, on the server: run deploy/auto_deploy.sh every minute with a systemd timer.
# Its output goes to the journal:  journalctl -u yzu-auto-deploy -f
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"

cat > /etc/systemd/system/yzu-auto-deploy.service <<EOF
[Unit]
Description=Deploy YZU Judge when GitHub main changes
After=docker.service network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/bash $REPO/deploy/auto_deploy.sh
EOF

cat > /etc/systemd/system/yzu-auto-deploy.timer <<EOF
[Unit]
Description=Check GitHub for YZU Judge updates every minute

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now yzu-auto-deploy.timer
systemctl list-timers yzu-auto-deploy.timer --no-pager
