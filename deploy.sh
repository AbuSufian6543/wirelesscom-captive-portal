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
  echo "Edit SESSION_SECRET, APP_ENCRYPTION_KEY, and INITIAL_ADMIN_PASSWORD, then run ./deploy.sh again."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${SESSION_SECRET:-}" || ${#SESSION_SECRET} -lt 32 ]]; then
  echo "SESSION_SECRET must be at least 32 characters."
  exit 1
fi
if [[ -z "${APP_ENCRYPTION_KEY:-}" || "${APP_ENCRYPTION_KEY}" == "replace-with-a-32-byte-base64-key" ]]; then
  echo "Set APP_ENCRYPTION_KEY to 32 bytes of base64."
  exit 1
fi
if [[ "${1:-}" != "--update" ]]; then
  if [[ -z "${INITIAL_ADMIN_PASSWORD:-}" || "${INITIAL_ADMIN_PASSWORD}" == "change-me-before-first-boot" || ${#INITIAL_ADMIN_PASSWORD} -lt 12 ]]; then
    echo "Set INITIAL_ADMIN_PASSWORD to a unique password of at least 12 characters."
    exit 1
  fi
fi

echo "Building the captive portal. Ports 80 and 443 stay on the separate NGINX server."
docker compose up -d --build
echo "Application is publishing ${APP_BIND_HOST:-127.0.0.1}:${APP_PORT:-3000}."
echo "Point the NGINX proxy at that private address. See docs/nginx.md."
