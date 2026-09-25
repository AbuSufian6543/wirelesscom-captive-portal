#!/bin/sh
set -eu
npx prisma migrate deploy
npx tsx prisma/seed.ts
exec npx next start -H "${APP_HOST:-0.0.0.0}" -p "${APP_PORT:-3000}"
