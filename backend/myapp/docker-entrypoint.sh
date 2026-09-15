#!/bin/sh
set -e

echo "[devlytics] applying database migrations to ${DATABASE_NAME:-devlytics_db}..."
npx prisma migrate deploy

echo "[devlytics] starting API"
exec "$@"
