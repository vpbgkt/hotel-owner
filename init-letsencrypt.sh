#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-time SSL bootstrap for the Hotel Manager Nginx + Certbot stack.
#
# What it does:
#   1. Starts Nginx in HTTP-only "bootstrap" mode (serves the ACME challenge).
#   2. Downloads Certbot's recommended TLS options + DH params.
#   3. Requests a real Let's Encrypt certificate for $DOMAIN.
#   4. Restarts Nginx, which detects the new cert and switches to full HTTPS.
#
# Usage:
#   bash init-letsencrypt.sh
#
# Requires: .env in the repo root with DOMAIN and LETSENCRYPT_EMAIL set.
# ─────────────────────────────────────────────────────────────────────────────
set -e

if [ ! -f .env ]; then
  echo "✖ .env not found. Copy .env.example to .env and set DOMAIN + LETSENCRYPT_EMAIL first."
  exit 1
fi
set -a
source .env
set +a

if [ -z "$DOMAIN" ] || [ -z "$LETSENCRYPT_EMAIL" ]; then
  echo "✖ DOMAIN and LETSENCRYPT_EMAIL must be set in .env"
  exit 1
fi

DATA_PATH="./certbot"
RSA_KEY_SIZE=4096
STAGING=${STAGING:-0}   # set STAGING=1 in your shell to test against LE's staging server first

echo "▶ Domain: $DOMAIN"
echo "▶ Email:  $LETSENCRYPT_EMAIL"

# ── 1. Download recommended TLS config (if not already present) ─────────────
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "▶ Downloading recommended TLS parameters..."
  mkdir -p "$DATA_PATH/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

mkdir -p "$DATA_PATH/www"

# ── 2. Start Nginx in bootstrap (HTTP-only) mode ──────────────────────────────
echo "▶ Starting Nginx (bootstrap mode)..."
docker compose up -d nginx

echo "▶ Waiting for Nginx to be ready..."
sleep 5

# ── 3. Request the certificate ────────────────────────────────────────────────
STAGING_ARG=""
if [ "$STAGING" != "0" ]; then STAGING_ARG="--staging"; fi

echo "▶ Requesting Let's Encrypt certificate for $DOMAIN..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $LETSENCRYPT_EMAIL \
    -d $DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# ── 4. Reload Nginx — it will now detect the cert and serve HTTPS ────────────
echo "▶ Reloading Nginx with the new certificate..."
docker compose restart nginx

echo ""
echo "✔ Done. Now run: docker compose up -d --build"
echo "  Your site should be reachable at https://$DOMAIN"
