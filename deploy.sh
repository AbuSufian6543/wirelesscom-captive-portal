#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install docker.io and docker-compose-v2, then run this again."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example."
fi

set_env() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  if grep -q "^${key}=" .env; then
    awk -v k="$key" -v v="$value" 'BEGIN { FS = OFS = "=" } $1 == k { print k "=" v; next } { print }' .env >"$tmp"
  else
    cp .env "$tmp"
    printf '%s=%s\n' "$key" "$value" >>"$tmp"
  fi
  mv "$tmp" .env
}

current_session="$(grep '^SESSION_SECRET=' .env | head -1 | cut -d= -f2- || true)"
if [[ -z "$current_session" || "$current_session" == "replace-with-a-long-random-string" || ${#current_session} -lt 32 ]]; then
  set_env SESSION_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  echo "Generated SESSION_SECRET in .env."
fi

current_key="$(grep '^APP_ENCRYPTION_KEY=' .env | head -1 | cut -d= -f2- || true)"
if [[ -z "$current_key" || "$current_key" == "replace-with-a-32-byte-base64-key" ]]; then
  set_env APP_ENCRYPTION_KEY "$(openssl rand -base64 32 | tr -d '\n')"
  echo "Generated APP_ENCRYPTION_KEY in .env."
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${INITIAL_ADMIN_PASSWORD:-}" || ${#INITIAL_ADMIN_PASSWORD} -lt 12 ]]; then
  echo "INITIAL_ADMIN_PASSWORD must be at least 12 characters."
  exit 1
fi

echo "Building the captive portal. Ports 80 and 443 stay on the separate NGINX server."
docker compose up -d --build
echo "Application is publishing ${APP_BIND_HOST:-127.0.0.1}:${APP_PORT:-3000}."
echo "Point the NGINX proxy at that private address. See docs/nginx.md."
