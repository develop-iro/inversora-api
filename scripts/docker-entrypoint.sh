#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS_ON_START:-true}" != "false" ]; then
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy
else
  echo "Skipping Prisma migrations (RUN_MIGRATIONS_ON_START=false)."
fi

echo "Starting Inversora API..."
exec node dist/main
