#!/bin/sh
set -e

if [ "$NODE_ENV" = "production" ]; then
  echo "Running database schema push..."
  cd /app/packages/db
  npx drizzle-kit push
  echo "Database schema push complete."
  cd /app
fi

exec tsx apps/server/src/index.ts
