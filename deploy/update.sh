#!/usr/bin/env bash
# Menarik versi terbaru dari GitHub, migrasi database, lalu restart backend.
# Jalankan:  sudo bash /srv/bebem/app/deploy/update.sh
set -euo pipefail

APP_USER=bebem
APP_DIR=/srv/bebem/app
SERVICE=bebem

[ "$(id -u)" -eq 0 ] || { echo "Jalankan dengan sudo: sudo bash $0"; exit 1; }

sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' \
  && git pull --ff-only \
  && npm ci --no-audit --no-fund \
  && npx prisma generate \
  && npx prisma migrate deploy"

systemctl restart "$SERVICE"
sleep 3
curl -fsS http://127.0.0.1:5001/health && echo
echo "Versi aktif: $(sudo -u "$APP_USER" git -C "$APP_DIR" log -1 --format='%h %s')"
