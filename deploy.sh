#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Installing Docker and starting the portal with administrator rights."
  exec sudo bash "$0" "$@"
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2 openssl
fi
if ! command -v openssl >/dev/null 2>&1; then
  apt-get update
  apt-get install -y openssl
fi
systemctl enable --now docker

if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  usermod -aG docker "${SUDO_USER}"
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

current_bind="$(grep '^APP_BIND_HOST=' .env | head -1 | cut -d= -f2- || true)"
if [[ -z "$current_bind" || "$current_bind" == "127.0.0.1" ]]; then
  private_ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i=="src") { print $(i+1); exit }}')"
  if [[ -n "$private_ip" ]]; then
    set_env APP_BIND_HOST "$private_ip"
    echo "Portal will listen on ${private_ip}:3000 for the NGINX server."
  fi
fi

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  fi
  export "${key}=${value}"
done < .env

if [[ -z "${INITIAL_ADMIN_PASSWORD:-}" || ${#INITIAL_ADMIN_PASSWORD} -lt 12 ]]; then
  echo "INITIAL_ADMIN_PASSWORD must be at least 12 characters."
  exit 1
fi

echo "Building the captive portal. Ports 80 and 443 stay on the separate NGINX server."
docker compose up -d --build

if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  chown -R "${SUDO_USER}:${SUDO_USER}" .
fi

echo "Application is publishing ${APP_BIND_HOST:-127.0.0.1}:${APP_PORT:-3000}."
echo "Point the NGINX proxy at that address. See docs/nginx.md."
