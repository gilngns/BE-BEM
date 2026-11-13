#!/usr/bin/env bash
# Setup backend Maggot BEM (Express + Prisma) di VPS Ubuntu yang SUDAH berisi landing Garda Hijau.
# Jalankan:  sudo bash setup-server.sh
# Aman dijalankan ulang: langkah yang sudah selesai akan dilewati.
#
# Hasil:
#   https://DOMAIN/api/...     -> backend (service bebem, 127.0.0.1:5001)
#   https://DOMAIN/api-docs    -> Swagger
# Landing (/, /admin, /web-api) tidak berubah.
set -euo pipefail

DOMAIN="${DOMAIN:-gardahijaukemdiktisaintek.digital}"
REPO_URL="${REPO_URL:-https://github.com/gilngns/BE-BEM.git}"
BRANCH="${BRANCH:-main}"

APP_USER=bebem
APP_HOME=/srv/bebem
APP_DIR=$APP_HOME/app
ENV_FILE=$APP_DIR/.env
SERVICE=bebem
PORT=5001
DB_NAME=bebem
DB_USER=bebem
NODE_MAJOR=24
NGINX_SITE=/etc/nginx/sites-available/gardahijau-web
NGINX_SNIPPET=/etc/nginx/snippets/bebem-api.conf

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
as_app() { sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && $*"; }

[ "$(id -u)" -eq 0 ] || { echo "Jalankan dengan sudo: sudo bash $0"; exit 1; }
[ -f "$NGINX_SITE" ] || { echo "Situs Nginx landing ($NGINX_SITE) tidak ditemukan. Pasang landing dulu."; exit 1; }

# ---------------------------------------------------------------- paket
step "Memeriksa Node.js dan PostgreSQL"
export DEBIAN_FRONTEND=noninteractive
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  apt-get update -y
  apt-get install -y curl ca-certificates
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
command -v psql >/dev/null || { apt-get update -y; apt-get install -y postgresql; }
node -v

# ---------------------------------------------------------------- kode
step "Membuat user aplikasi dan mengambil kode"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "$APP_HOME" --shell /bin/bash "$APP_USER"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" -H git -C "$APP_DIR" pull --ff-only
else
  sudo -u "$APP_USER" -H git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# ---------------------------------------------------------------- database + env
if [ -f "$ENV_FILE" ]; then
  step ".env sudah ada, database dan rahasia tidak diubah"
else
  step "Membuat database PostgreSQL dan .env"
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE $DB_USER LOGIN; END IF;
END \$\$;
ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

  install -o "$APP_USER" -g "$APP_USER" -m 600 /dev/null "$ENV_FILE"
  cat > "$ENV_FILE" <<ENV
# Dibuat oleh deploy/setup-server.sh pada $(date -u +%Y-%m-%dT%H:%MZ). Jangan commit file ini.
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME"
JWT_SECRET="$(openssl rand -hex 48)"

# Layanan AI di VPS yang sama (lihat repo AI-BEM)
ML_BASE_URL="http://127.0.0.1:5000"
ML_TIMEOUT_MS=15000
CHATBOT_BASE_URL="http://127.0.0.1:5002"
CHATBOT_TIMEOUT_MS=60000

PORT=$PORT
# Di belakang Nginx: wajib, supaya rate limit memakai IP asli tiap HP
TRUST_PROXY=1
CORS_ORIGIN=
API_BASE_URL="https://$DOMAIN"
DISABLE_SWAGGER=false
ENV
fi

# ---------------------------------------------------------------- build
step "Install dependency dan migrasi database"
as_app "npm ci --no-audit --no-fund"
as_app "npx prisma generate"
as_app "npx prisma migrate deploy"

# ---------------------------------------------------------------- service
step "Mendaftarkan service systemd ($SERVICE)"
cat > /etc/systemd/system/$SERVICE.service <<UNIT
[Unit]
Description=Maggot BEM backend (Express)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$(command -v node) src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

# ---------------------------------------------------------------- nginx
step "Menambahkan /api dan /api-docs ke Nginx $DOMAIN"
cat > "$NGINX_SNIPPET" <<NGINX
# Backend Maggot BEM (dipasang oleh BE-BEM/deploy/setup-server.sh)
location /api/ {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 120s;
}
location /api-docs {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
NGINX
if ! grep -q "snippets/bebem-api.conf" "$NGINX_SITE"; then
  cp "$NGINX_SITE" "$NGINX_SITE.bak-$(date +%Y%m%d%H%M%S)"
  # Sisipkan setelah server_name pertama = blok HTTPS hasil certbot
  awk '!done && /^[[:space:]]*server_name[[:space:]]/ { print; print "    include snippets/bebem-api.conf;"; done=1; next } { print }' \
    "$NGINX_SITE" > "$NGINX_SITE.tmp" && mv "$NGINX_SITE.tmp" "$NGINX_SITE"
fi
if ! nginx -t; then
  warn "Konfigurasi Nginx error, mengembalikan konfigurasi sebelumnya"
  latest=$(ls -t "$NGINX_SITE".bak-* 2>/dev/null | head -1)
  [ -n "$latest" ] && cp "$latest" "$NGINX_SITE"
  nginx -t && systemctl reload nginx
  exit 1
fi
systemctl reload nginx

# ---------------------------------------------------------------- backup
step "Menambahkan backup harian database backend"
install -d -o postgres -g postgres -m 700 /var/backups/bebem
cat > /etc/cron.d/bebem-backup <<'CRON'
40 2 * * * postgres pg_dump -Fc bebem > /var/backups/bebem/bebem-$(date +\%F).dump && find /var/backups/bebem -name '*.dump' -mtime +14 -delete
CRON

# ---------------------------------------------------------------- cek
step "Pemeriksaan"
for _ in $(seq 1 20); do curl -fsS -o /dev/null "http://127.0.0.1:$PORT/health" 2>/dev/null && break; sleep 1; done
check() { # label, url, [argumen curl tambahan]
  local label=$1 url=$2 out code; shift 2
  code=$(curl -sS -o /tmp/bebem-check -w '%{http_code}' "$@" "$url" 2>/dev/null) || code=000
  out=$(head -c 160 /tmp/bebem-check 2>/dev/null || true)
  printf '%-22s %s %s\n' "$label" "$code" "$out"
}
check "Backend lokal"        "http://127.0.0.1:$PORT/health"
check "Lewat domain"         "https://$DOMAIN/api/auth/login" -X POST -H 'Content-Type: application/json' -d '{}'
check "Swagger"              "https://$DOMAIN/api-docs.json"
check "Landing (tidak berubah)" "https://$DOMAIN/web-api/health"
check "AI prediksi"          "http://127.0.0.1:5000/api/health"
check "AI chatbot"           "http://127.0.0.1:5002/health"
rm -f /tmp/bebem-check

echo
echo "Selesai. Base URL untuk aplikasi Android: https://$DOMAIN"
echo "Dokumentasi API: https://$DOMAIN/api-docs"
echo "(Respons 400 pada 'Lewat domain' itu normal: login dengan body kosong memang ditolak.)"
exit 0
